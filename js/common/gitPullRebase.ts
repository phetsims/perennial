// Copyright 2017-2026, University of Colorado Boulder

/**
 * git pull --rebase
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

/**
 * Executes git pull
 *
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitPullRebase = async (): Promise<string> => {
  winston.info( `git pull --rebase` );

  return execute( 'git', [ 'pull', '--rebase' ], '..' );
};
