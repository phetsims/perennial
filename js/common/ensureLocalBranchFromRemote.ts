// Copyright 2026, University of Colorado Boulder

/**
 * If your local totality does not have a remote branch, this script will grab it and set up tracking on it.
 * This script will start and end on the same, current branch the repo is on, but checkouts the `branch` param while
 * running.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitImmutableExecute, gitMutableExecute } from './git/gitMutex.js';
import { Branch } from '../browser-and-node/PerennialTypes.js';

export const ensureLocalBranchFromRemote = async ( branch: Branch ): Promise<void> => {
  winston.info( `ensuring local branch from remote: ${branch}` );

  await gitMutableExecute( [
    'fetch',
    'origin',
    branch
  ], '..' );

  const exists = (
    await gitImmutableExecute( [
      'show-ref',
      '--verify',
      '--quiet',
      `refs/heads/${branch}`
    ], '..', { errors: 'resolve' } )
  ).code === 0;

  if ( !exists ) {
    await gitMutableExecute( [
      'branch',
      '--track',
      branch,
      `origin/${branch}`
    ], '..' );
  }
  else {
    await gitMutableExecute( [
      'branch',
      '--set-upstream-to',
      `origin/${branch}`,
      branch
    ], '..' );
  }
};
