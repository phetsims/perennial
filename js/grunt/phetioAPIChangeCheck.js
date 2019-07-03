// Copyright 2019, University of Colorado Boulder

/**
 * This file makes sure that phet-io apis aren't changed in a breaking way between maintenance releases.
 * This error check should only occur if:
 *   building phet-io brand
 *   not the first maintenance release for the minor version
 *   supports json api files (so publications after 7/2019)
 *
 * This code assumes that the built sim has already been created in the build directory.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Chris Klusendorf (PhET Interactive Simulations)
 */

'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line
const booleanPrompt = require( '../common/booleanPrompt' );
const buildLocal = require( '../common/buildLocal' );
const grunt = require( 'grunt' );
const request = require( 'request-promise-native' ); //eslint-disable-line

/**
 * @param {string} repo
 * @param {SimVersion} version
 * @param {function(string):Promise.<void>} [onError] - async function to hand the error case
 * @param {boolean} [noninteractive] - for the booleanPrompt
 * @returns {Promise.<void>}
 * @public
 */
module.exports = async ( repo, version, onError = async () => {}, noninteractive = false ) => {
  const phetioAPIFileName = `${repo}-phet-io-api.json`;
  const builtVersionAPIFile = `../${repo}/build/phet-io/${phetioAPIFileName}`;

  const uri = buildLocal.productionServerURL +
              `/services/metadata/phetio?name=${repo}`;
  const versions = JSON.parse( await request( uri ) );

  // look through all versions for the sim, but only keep the ones that match this major/minor version
  const filteredDeployedVersions = versions.filter( versionObject => {
    return versionObject.versionMajor === version.major && versionObject.versionMinor === version.minor;
  } );


  // if there is no local output api json, then this sim/version doesn't support this, so move on
  if ( filteredDeployedVersions.length > 0 && grunt.file.exists( builtVersionAPIFile ) ) {

    // get the latest deployed version from the list
    const latestVersion = _.last( filteredDeployedVersions.sort( compareMetadataVersions ) );

    const latestVersionString = `${latestVersion.versionMajor}.${latestVersion.versionMinor}.${latestVersion.versionMaintenance}`;

    const latestDeployedVersionAPI = JSON.parse( await request( `https://phet-io.colorado.edu/sims/${repo}/${latestVersionString}/${phetioAPIFileName}` ) );

    const builtVersionAPI = JSON.parse( grunt.file.read( builtVersionAPIFile ) );

    // This is a naive algorithm. Ideally we would only check for breaking changes.
    // TODO: make this better with the output from https://github.com/phetsims/phet-io/issues/1523
    if ( !_.isEqual( latestDeployedVersionAPI, builtVersionAPI ) ) {

      // we don't want noninteractive build skating through this, so error out in that case.
      if ( noninteractive || !await booleanPrompt( 'This version has a potentially breaking phet-io API change ' +
                                                   'from the previous maintenance version. Are you sure you want to ' +
                                                   'continue with this production deployment?', noninteractive ) ) {

        await onError( 'This version has an API change from the previous maintenance version. Aborted ' +
                       'production deployment (aborted version change too).' );
      }
    }
  }
};


/**
 * Sorting compare function between two version objects returned from the phet-io metadata service
 * Each has keys like "versionMajor", "versionMinor", and "versionMaintenance" see phet-io metadata doc for more info.
 * @param {Object} version1
 * @param {Object} version2
 * @returns {number}
 */
function compareMetadataVersions( version1, version2 ) {
  if ( version1.versionMajor < version2.versionMajor ) { return -1; }
  if ( version1.versionMajor > version2.versionMajor ) { return 1; }
  if ( version1.versionMinor < version2.versionMinor ) { return -1; }
  if ( version1.versionMinor > version2.versionMinor ) { return 1; }
  if ( version1.versionMaintenance < version2.versionMaintenance ) { return -1; }
  if ( version1.versionMaintenance > version2.versionMaintenance ) { return 1; }
  return 0; // equal
}