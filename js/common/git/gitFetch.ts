// Copyright 2021-2026, University of Colorado Boulder

/**
 * git fetch
 *
 * TODO: can we remove this, rely on Checkout? https://github.com/phetsims/totality/issues/140
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitMutableExecute } from './gitMutex.js';

/**
 * Executes git fetch
 *
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitFetch = async (): Promise<string> => {
  winston.info( 'git fetch' );

  return gitMutableExecute( [ 'fetch' ], '..' );
};
