// Copyright 2017-2026, University of Colorado Boulder

/**
 * git add
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitMutableExecute } from './gitMutex.js';

/**
 * Executes git add
 *
 * @param file - The file to be added
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitAdd = async ( file: string ): Promise<string> => {
  winston.info( `git add ${file}` );

  return gitMutableExecute( [ 'add', file ], '..' );
};
