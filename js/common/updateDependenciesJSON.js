// Copyright 2017, University of Colorado Boulder

/**
 * Updates the top-level dependencies.json, given the result of a build in the build directory.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const brandToSuffix = require( './brandToSuffix' );
const copyFile = require( './copyFile' );
const gitAdd = require( './gitAdd' );
const gitCommit = require( './gitCommit' );
const gitPush = require( './gitPush' );
const winston = require( 'winston' );

/**
 * Updates the top-level dependencies.json, given the result of a build in the build directory.
 * @public
 *
 * @param {string} repo - The repository that was built
 * @param {Array.<string>} brands - The brands that were built
 * @param {string} versionString
 * @param {string} branch - The branch we're on (to push to)
 * @returns {Promise}
 */
module.exports = async function( repo, brands, versionString, branch ) {
  winston.info( `updating top-level dependencies.json for ${repo} ${versionString}` );

  await copyFile( `../${repo}/build/${brandToSuffix( brands[ 0 ] )}/dependencies.json`, `../${repo}/dependencies.json` );
  await gitAdd( repo, 'dependencies.json' );
  await gitCommit( repo, `updated dependencies.json for version ${versionString}` );
  await gitPush( repo, branch );
};
