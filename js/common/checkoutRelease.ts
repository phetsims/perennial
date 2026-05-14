// Copyright 2017-2026, University of Colorado Boulder

/**
 * Checks out the latest deployed production release branch (and dependencies) for a repository.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import assert from 'assert';
import winston from 'winston';
import simMetadata from './simMetadata.js';
import { Checkout } from './Checkout.js';
import { Repo } from '../browser-and-node/PerennialTypes.js';

/**
 * Checks out the latest release branch (and dependencies) for a repository.
 */
export const checkoutRelease = async ( repo: Repo ): Promise<void> => {
  winston.info( `checking out release for ${repo}` );

  const data = await simMetadata( {
    simulation: repo
  } );

  assert( data.projects.length === 1, 'Metadata request should only return 1 simulation result' );

  const branch = `${data.projects[ 0 ].version.major}.${data.projects[ 0 ].version.minor}`;

  await ( await Checkout.getReleaseBranchCheckout( repo, branch ) ).update();
};