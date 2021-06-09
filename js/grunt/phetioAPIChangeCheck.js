// Copyright 2019, University of Colorado Boulder

/**
 * This file makes sure that PhET-iO APIs aren't changed in a breaking way between maintenance releases.
 * This error check should only occur if:
 *   building phet-io brand
 *   not the first maintenance release for the minor version
 *   supports JSON API files (so publications after 7/2019)
 *
 * This code assumes that the built sim has already been created in the build directory.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Chris Klusendorf (PhET Interactive Simulations)
 */

'use strict';

const booleanPrompt = require( '../common/booleanPrompt' );
const buildLocal = require( '../common/buildLocal' );
const assert = require( 'assert' );
const grunt = require( 'grunt' );
const _ = require( 'lodash' ); // eslint-disable-line
const request = require( 'request-promise-native' ); //eslint-disable-line

/**
 * @param {string} repo
 * @param {SimVersion} version
 * @param {function(string):Promise.<void>} [onError] - async function to hand the error case
 * @param {boolean} [noninteractive] - for the booleanPrompt
 * @public
 */
module.exports = async ( repo, version, onError = async () => {}, noninteractive = false ) => {
  const phetioAPIFileName = `${repo}-phet-io-api.json`;
  const builtVersionAPIFile = `../${repo}/build/phet-io/${phetioAPIFileName}`;

  const metadataURL = `${buildLocal.productionServerURL
  }/services/metadata/phetio?name=${repo}&versionMajor=${version.major}&versionMinor=${version.minor}&latest=true`;
  const versions = JSON.parse( await request( metadataURL ) );

  // if there is no previously published version for this minor, no API comparison is needed
  // if an API file doesn't exist for this phet-io version, then no API comparison is needed
  if ( versions.length === 0 || !grunt.file.exists( builtVersionAPIFile ) ) {
    return;
  }
  assert( versions.length === 1, `there should only be one latest maintenance version per minor: ${versions}` );
  const latestVersion = versions[ 0 ];

  const latestVersionString = `${latestVersion.versionMajor}.${latestVersion.versionMinor}.${latestVersion.versionMaintenance}`;

  const latestDeployedURL = `https://phet-io.colorado.edu/sims/${repo}/${latestVersionString}/${phetioAPIFileName}`;
  const latestDeployedVersionAPI = JSON.parse( await request( latestDeployedURL ) );

  const builtVersionAPI = JSON.parse( grunt.file.read( builtVersionAPIFile ) );

  // This is a naive algorithm. Ideally we would only check for breaking changes.
  // TODO: make this better with the output from https://github.com/phetsims/phet-io/issues/1523
  if ( !_.isEqual( latestDeployedVersionAPI, builtVersionAPI ) ) {

    // we don't want noninteractive build skating through this, so error out in that case.
    if ( noninteractive || !await booleanPrompt( 'This version has a potentially breaking PhET-iO API change ' +
                                                 'from the previous maintenance version. Are you sure you want to ' +
                                                 'continue with this production deployment?', noninteractive ) ) {

      await onError( 'This version has an API change from the previous maintenance version. Aborted ' +
                     'production deployment (aborted version change too).' );
    }
  }
};