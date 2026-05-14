// Copyright 2017-2026, University of Colorado Boulder

/**
 * Executes a command on a remote server.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

/**
 * Executes a command on a remote server.
 *
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
export const ssh = async (
  username: string,
  host: string,
  cmd: string
): Promise<string> => {
  winston.info( `running ${cmd} remotely on ${host}` );

  return execute( 'ssh', [
    `${username}@${host}`,
    cmd
  ], '.' );
};
