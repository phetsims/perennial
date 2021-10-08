// Copyright 2017, University of Colorado Boulder

/**
 * Checks to see if the git state/status is clean
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( '../common/execute' );
const winston = require( 'winston' );

/**
 * Checks to see if the git state/status is clean
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<boolean>} - Whether it is clean or not
 * @rejects {ExecuteError}
 */
module.exports = function( repo ) {
  winston.debug( `git status check on ${repo}` );

  return execute( 'git', [ 'status', '--porcelain' ], `../${repo}` ).then( stdout => Promise.resolve( stdout.length === 0 ) );
};
