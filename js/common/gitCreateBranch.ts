// Copyright 2018-2026, University of Colorado Boulder

/**
 * git checkout -b {{BRANCH}}
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

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

  return execute( 'git', [ 'checkout', '-b', branch ], '..' );
};
