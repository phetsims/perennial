// Copyright 2020, University of Colorado Boulder

/**
 * Updates the development/test HTML as needed for a change in the version. Updates are based on the version in the
 * package.json. This will also commit if an update occurs.
 *
 * See https://github.com/phetsims/chipper/issues/926
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const gitAdd = require( './gitAdd' );
const gitCommit = require( './gitCommit' );
const gitIsClean = require( './gitIsClean' );
const gruntCommand = require( './gruntCommand' );
const loadJSON = require( './loadJSON' );
const winston = require( 'winston' );

/**
 * Updates the development/test HTML as needed for a change in the version, and creates a commit.
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise}
 */
module.exports = async function( repo ) {
  winston.info( `Updating HTML for ${repo} with the new version strings` );

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot clean up HTML` );
  }

  // We'll want to update development/test HTML as necessary, since they'll include the version
  const packageObject = await loadJSON( `../${repo}/package.json` );
  await execute( gruntCommand, [ 'generate-development-html' ], `../${repo}` );
  await gitAdd( repo, `${repo}_en.html` );

  if ( packageObject.phet.generatedUnitTests ) {
    await execute( gruntCommand, [ 'generate-test-html' ], `../${repo}` );
    await gitAdd( repo, `${repo}-tests.html` );
  }
  if ( !( await gitIsClean( repo ) ) ) {
    await gitCommit( repo, `Bumping dev${packageObject.phet.generatedUnitTests ? '/test' : ''} HTML with new version` );
  }
};
