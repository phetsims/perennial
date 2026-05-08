// Copyright 2017-2026, University of Colorado Boulder

/**
 * Runs `grunt transpile --all` in current version of chipper. Will hard fail if on old shas that predate this task
 * creation in 10/2024.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */

import execute from './execute.js';
import { gruntCommand } from './gruntCommand.js';
import winston from 'winston';

/**
 * Outputs transpiled JS for all repos
 */
export const transpileAll = async (): Promise<string> => {
  winston.info( 'running transpileAll' );
  return execute( gruntCommand, [ 'transpile', '--all', '--silent' ], '../chipper' );
};
