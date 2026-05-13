// Copyright 2017-2026, University of Colorado Boulder

/**
 * git commit
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitMutableExecute } from './gitMutex.js';

/**
 * Executes git commit
 *
 * @param message - The message to include in the commit
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitCommit = ( message: string ): Promise<string> => {
  winston.info( `git commit with message:\n${message}` );

  return gitMutableExecute( [ 'commit', '--no-verify', '-m', message ], '..' );
};
