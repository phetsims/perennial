// Copyright 2017-2026, University of Colorado Boulder

/**
 * Checks to see if the git state/status is clean
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitImmutableExecute } from './gitMutex.js';

/**
 * Checks to see if the git state/status is clean
 *
 * TODO: replace with checkout.isClean() unless we are specifying the file
 *
 * @param [file] - Optional file or path if you only want to check state of a single file or subdirectory
 * @returns - Whether it is clean or not
 * @rejects {ExecuteError}
 */
export const gitIsClean = async ( file?: string ): Promise<boolean> => {
  winston.debug( 'git status check' );

  const gitArgs = [ 'status', '--porcelain' ];

  if ( file ) {
    gitArgs.push( file );
  }
  return gitImmutableExecute( gitArgs, '..' ).then( stdout => Promise.resolve( stdout.length === 0 ) );
};
