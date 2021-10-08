// Copyright 2017, University of Colorado Boulder

/**
 * Updates the top-level dependencies.json, given the result of a build in the build directory.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const ChipperVersion = require( './ChipperVersion' );
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
 * @param {string} message
 * @param {string} branch - The branch we're on (to push to)
 * @returns {Promise}
 */
module.exports = async function( repo, brands, message, branch ) {
  winston.info( `updating top-level dependencies.json for ${repo} ${message} to branch ${branch}` );

  const chipperVersion = ChipperVersion.getFromRepository();

  let buildDepdenciesFile;

  // Chipper "1.0" (it was called such) had version 0.0.0 in its package.json
  if ( chipperVersion.major === 0 && chipperVersion.minor === 0 ) {
    buildDepdenciesFile = `../${repo}/build/dependencies.json`;
  }
  // Chipper 2.0
  else if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
    buildDepdenciesFile = `../${repo}/build/${brands[ 0 ]}/dependencies.json`;
  }
  else {
    throw new Error( `unsupported chipper version: ${chipperVersion.toString()}` );
  }

  await copyFile( buildDepdenciesFile, `../${repo}/dependencies.json` );
  await gitAdd( repo, 'dependencies.json' );
  await gitCommit( repo, `updated dependencies.json for ${message}` );
  await gitPush( repo, branch );
};
