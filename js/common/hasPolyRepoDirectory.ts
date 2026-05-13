// Copyright 2023, University of Colorado Boulder

/**
 * Whether the poly repo directory has git status.
 *
 * TODO: can we remove this now?
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

import { gitImmutableExecute } from './gitMutex.js';

export const hasPolyRepoDirectory = async ( repo: string ): Promise<boolean> => {
  try {

    // an arbitrary command that will fail if the repo is not initialized
    await gitImmutableExecute( [ 'status' ], `../${repo}` );
    return true;
  }
  catch( error ) {
    return false;
  }
};
