// Copyright 2018-2026, University of Colorado Boulder

/**
 * git checkout -b {{BRANCH}}
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitMutableExecute } from './gitMutex.js';

/**
 * Executes git checkout -b {{BRANCH}}
 * @public
 *
 * @param branch - The branch name to create
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitCreateBranch = async ( branch: string ): Promise<string> => {
  winston.info( `git checkout -b ${branch}` );

  return gitMutableExecute( [ 'checkout', '-b', branch ], '..' );
};
