// Copyright 2017, University of Colorado Boulder

/**
 * Executes a command on the dev server
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const buildLocal = require( './buildLocal' );
const ssh = require( './ssh' );

/**
 * Executes a command on the dev server
 * @public
 *
 * @param {string} cmd
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( cmd ) {
  return ssh( buildLocal.devUsername, buildLocal.devDeployServer, cmd );
};
