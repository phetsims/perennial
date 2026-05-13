// Copyright 2017-2026, University of Colorado Boulder

/**
 * git push
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitMutableExecute } from './gitMutex.js';

/**
 * Executes git push
 *
 * @param remoteBranch - The branch that is getting pushed to, e.g. 'main' or '1.0'
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitPush = async ( remoteBranch: string = 'main' ): Promise<string> => {
  winston.info( `git push to ${remoteBranch}` );

  return gitMutableExecute( [ 'push', '-u', 'origin', remoteBranch ], '..' );
};
