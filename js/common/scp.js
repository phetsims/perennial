// Copyright 2017, University of Colorado Boulder

/**
 * Transfers a file (or directory recursively) to a remote server.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Transfers a file (or directory recursively) to a remote server.
 * @public
 *
 * @param {string} username
 * @param {string} host
 * @param {string} localFile - A file, directory or glob pattern. Basically the first part of the SCP command
 * @param {string} remoteFile - A file or directory. Basically the second part of the SCP command (minus the host/username)
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = async function( username, host, localFile, remoteFile ) {
  winston.info( `transferring ${localFile} remotely to ${remoteFile} on ${host} from ${await execute( 'pwd', [], '.' )}` );

  return execute( 'scp', [
    '-r',
    localFile,
    `${username}@${host}:${remoteFile}`
  ], '.' );
};
