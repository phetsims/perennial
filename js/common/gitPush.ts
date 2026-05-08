// Copyright 2017-2026, University of Colorado Boulder

/**
 * git push
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

/**
 * Executes git push
 *
 * @param remoteBranch - The branch that is getting pushed to, e.g. 'main' or '1.0'
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitPush = async ( remoteBranch: string = 'main' ): Promise<string> => {
  winston.info( `git push to ${remoteBranch}` );

  return execute( 'git', [ 'push', '-u', 'origin', remoteBranch ], '..' );
};
