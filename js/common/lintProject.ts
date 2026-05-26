// Copyright 2017-2026, University of Colorado Boulder

/**
 * Lints a runnable repository and its dependencies.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import { gruntCommand } from './gruntCommand.js';
import winston from 'winston';
import { Runnable } from '../browser-and-node/PerennialTypes.js';

/**
 * Builds a repository.
 *
 * @returns - The stdout of the process
 */
export const lintProject = async ( runnable: Runnable ): Promise<string> => {
  winston.info( `linting ${runnable}` );

  // Lint from chipper in case sim runnable doesn't have node_modules, see https://github.com/phetsims/totality/issues/27
  return execute( gruntCommand, [ 'lint-project', `--repo=${runnable}` ], '../chipper' );
};