// Copyright 2021, University of Colorado Boulder

/**
 * git fetch
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Executes git fetch
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( repo ) {
  winston.info( `git fetch on ${repo}` );

  return execute( 'git', [ 'fetch' ], `../${repo}` );
};
