// Copyright 2018-2026, University of Colorado Boulder

/**
 * git checkout -b {{BRANCH}}
 *
 * TODO: can this be removed, use checkouts directly? https://github.com/phetsims/totality/issues/140
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitMutableExecute } from './gitMutex.js';
import { Branch } from '../browser-and-node/PerennialTypes.js';

/**
 * Executes git checkout -b {{BRANCH}}
 *
 * @param branch - The branch name to create
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitCreateBranch = async ( branch: Branch ): Promise<string> => {
  winston.info( `git checkout -b ${branch}` );

  return gitMutableExecute( [ 'checkout', '-b', branch ], '..' );
};
