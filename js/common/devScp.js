// Copyright 2017, University of Colorado Boulder

/**
 * Transfers a file (or directory recursively) to the dev server
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const buildLocal = require( './buildLocal' );
const scp = require( './scp' );

/**
 * Transfers a file (or directory recursively) to the dev server
 * @public
 *
 * @param {string} localFile - A file, directory or glob pattern. Basically the first part of the SCP command
 * @param {string} remoteFile - A file or directory. Basically the second part of the SCP command (minus the host/username)
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( localFile, remoteFile ) {
  return scp( buildLocal.devUsername, buildLocal.devDeployServer, localFile, remoteFile );
};
