// Copyright 2017, University of Colorado Boulder

/**
 * git cherry-pick (but if it fails, it will back out of the cherry-pick)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Executes git cherry-pick (but if it fails, it will back out of the cherry-pick)
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - The SHA/branch/whatnot to check out
 * @returns {Promise.<boolean>} - Resolves to whether the cherry-pick worked or not. If aborting fails, will reject.
 */
module.exports = function( repo, target ) {
  winston.info( `git cherry-pick ${target} on ${repo}` );

  return execute( 'git', [ 'cherry-pick', target ], `../${repo}` ).then( stdout => Promise.resolve( true ), cherryPickError => {
    winston.info( `git cherry-pick failed (aborting): ${target} on ${repo}` );

    return execute( 'git', [ 'cherry-pick', '--abort' ], `../${repo}` ).then( stdout => Promise.resolve( false ), abortError => {
      winston.error( `git cherry-pick --abort failed: ${target} on ${repo}` );
      return Promise.reject( abortError );
    } );
  } );
};
