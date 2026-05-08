// Copyright 2023, University of Colorado Boulder

/**
 * Whether the poly repo directory has git status.
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

import execute from './execute.js';

export const hasPolyRepoDirectory = async ( repo: string ): Promise<boolean> => {
  try {

    // an arbitrary command that will fail if the repo is not initialized
    await execute( 'git', [ 'status' ], `../${repo}` );
    return true;
  }
  catch( error ) {
    return false;
  }
};
