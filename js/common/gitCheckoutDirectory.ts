// Copyright 2017-2026, University of Colorado Boulder

/**
 * git checkout
 *
 * TODO: try to minimize usage of this?
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';
import { gitMutableExecute } from './gitMutex.js';

/**
 * Executes git checkout
 *
 * @param target - The SHA/branch/whatnot to check out
 * @param directory - The working cwd directory
 * @returns =- Stdout
 * @rejects {ExecuteError}
 */
export const gitCheckoutDirectory = async ( target: string, directory: string ): Promise<string> => {
  winston.info( `git checkout ${target} in ${directory}` );

  return gitMutableExecute( [ 'checkout', target ], directory );
};
