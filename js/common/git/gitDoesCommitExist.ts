// Copyright 2021-2026, University of Colorado Boulder

/**
 * Checks whether a git commit exists (locally) in a repo
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitImmutableExecute } from './gitMutex.js';
import { SHA } from '../../browser-and-node/PerennialTypes.js';

/**
 * Executes git commit
 *
 * @param sha - The SHA of the commit
 */
export const gitDoesCommitExist = async ( sha: SHA ): Promise<boolean> => {
  const result = await gitImmutableExecute( [ 'cat-file', '-e', sha ], '..', {
    errors: 'resolve'
  } );

  if ( result.code === 0 ) {
    return true;
  }
  else if ( result.code === 1 ) {
    return false;
  }
  else {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    throw new Error( `Non-zero and non-one exit code from git cat-file: ${result}` );
  }
};
