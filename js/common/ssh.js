// Copyright 2017, University of Colorado Boulder

/**
 * Executes a command on a remote server.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Executes a command on a remote server.
 * @public
 *
 * @param {string} username
 * @param {string} host
 * @param {string} cmd - The process to execute.
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( username, host, cmd ) {
  winston.info( `running ${cmd} remotely on ${host}` );

  return execute( 'ssh', [
    `${username}@${host}`,
    cmd
  ], '.' );
};
