// Copyright 2017-2026, University of Colorado Boulder

/**
 * Whether there is a remote branch for a given repo.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitImmutableExecute } from './gitMutex.js';

/**
 * Whether there is a remote branch for a given repo.
 *
 * @param branch - The potential branch
 * @returns - Whether there was the branch on the remote server
 */
export const hasRemoteBranch = async ( branch: string ): Promise<boolean> => {
  winston.debug( `checking for remote branch ${branch}` );

  const stdout = await gitImmutableExecute( [ 'ls-remote', '--heads', 'https://github.com/phetsims/totality.git', branch ], '..' );

  if ( stdout.trim().length === 0 ) {
    return false;
  }
  else if ( stdout.includes( `refs/heads/${branch}` ) ) {
    return true;
  }
  else {
    throw new Error( `Failure trying to check for a remote branch ${branch}` );
  }
};
