// Copyright 2017-2026, University of Colorado Boulder

/**
 * Transfers a file (or directory recursively) to a remote server.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

/**
 * Transfers a file (or directory recursively) to a remote server.
 *
 * @param username
 * @param host
 * @param localFile - A file, directory or glob pattern. Basically the first part of the SCP command
 * @param remoteFile - A file or directory. Basically the second part of the SCP command (minus the host/username)
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const scp = async (
  username: string,
  host: string,
  localFile: string,
  remoteFile: string
): Promise<string> => {
  winston.info( `transferring ${localFile} remotely to ${remoteFile} on ${host} from ${await execute( 'pwd', [], '.' )}` );

  return execute( 'scp', [
    '-r',
    localFile,
    `${username}@${host}:${remoteFile}`
  ], '.' );
};