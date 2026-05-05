// Copyright 2026, University of Colorado Boulder

/**
 * If your local totality does not have a remote branch, this script will grab it and set up tracking on it.
 * This script will start and end on the same, current branch the repo is on, but checkouts the `branch` param while
 * running.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';

export const createTotalityLocalBranchFromRemote = async ( branch: string ): Promise<void> => {
  await execute( 'git', [
    'fetch',
    'origin',
    branch
  ], '..' );

  const exists = (
    await execute( 'git', [
      'show-ref',
      '--verify',
      '--quiet',
      `refs/heads/${branch}`
    ], '..', { errors: 'resolve' } )
  ).code === 0;

  if ( !exists ) {
    await execute( 'git', [
      'branch',
      '--track',
      branch,
      `origin/${branch}`
    ], '..' );
  }
  else {
    await execute( 'git', [
      'branch',
      '--set-upstream-to',
      `origin/${branch}`,
      branch
    ], '..' );
  }
};
