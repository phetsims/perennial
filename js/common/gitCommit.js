// Copyright 2017, University of Colorado Boulder

/**
 * git commit
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Executes git commit
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} message - The message to include in the commit
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( repo, message ) {
  winston.info( `git commit on ${repo} with message:\n${message}` );

  return execute( 'git', [ 'commit', '--no-verify', '-m', message ], `../${repo}` );
};
