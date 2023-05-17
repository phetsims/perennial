// Copyright 2023, University of Colorado Boulder

/**
 * git pull
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Executes git pull
 * @public
 *
 * @param {string} directory
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( directory ) {
  winston.info( `git pull in ${directory}` );

  return execute( 'git', [ 'pull' ], directory );
};
