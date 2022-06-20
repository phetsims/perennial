// Copyright 2017-2022, University of Colorado Boulder

/**
 * Checks to see if the git state/status is clean
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Checks to see if the git state/status is clean
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} [file] - Optional file or path if you only want to check state of a single file or subdirectory
 * @returns {Promise.<boolean>} - Whether it is clean or not
 * @rejects {ExecuteError}
 */
module.exports = function( repo, file ) {
  winston.debug( `git status check on ${repo}` );

  const gitArgs = [ 'status', '--porcelain' ];

  if ( file ) {
    gitArgs.push( file );
  }
  return execute( 'git', gitArgs, `../${repo}` ).then( stdout => Promise.resolve( stdout.length === 0 ) );
};
