// Copyright 2017-2026, University of Colorado Boulder

/**
 * Lints a runnable repository and its dependencies.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import { gruntCommand } from './gruntCommand.js';
import winston from 'winston';
import { Repo } from '../browser-and-node/PerennialTypes.js';

/**
 * Builds a repository.
 *
 * @param repo
 * @returns - The stdout of the process
 * @rejects {ExecuteError}
 */
export const lintProject = async ( repo: Repo ): Promise<string> => {
  winston.info( `linting ${repo}` );

  // Lint from chipper in case sim repo doesn't have node_modules, see https://github.com/phetsims/totality/issues/27
  return execute( gruntCommand, [ 'lint-project', `--repo=${repo}` ], '../chipper' );
};