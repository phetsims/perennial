// Copyright 2023, University of Colorado Boulder

/**
 * git pull the specified path. Needs to work for repos relative to this copy of
 * perennial, AND in ../release-branches/REPO-VERSION/REPO/
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' ).default;
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