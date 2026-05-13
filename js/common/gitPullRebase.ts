// Copyright 2017-2026, University of Colorado Boulder

/**
 * git pull --rebase
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitMutableExecute } from './gitMutex.js';

/**
 * Executes git pull
 *
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitPullRebase = async (): Promise<string> => {
  winston.info( `git pull --rebase` );

  return gitMutableExecute( [ 'pull', '--rebase' ], '..' );
};
