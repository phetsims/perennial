// Copyright 2021-2026, University of Colorado Boulder

/**
 * git fetch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute';
import winston from 'winston';

/**
 * Executes git fetch
 *
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitFetch = async (): Promise<string> => {
  winston.info( 'git fetch' );

  return execute( 'git', [ 'fetch' ], '..' );
};
