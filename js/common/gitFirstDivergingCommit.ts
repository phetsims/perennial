// Copyright 2021-2026, University of Colorado Boulder

/**
 * Provides the SHA of the first SHA from a target that diverges from the second target
 *
 * e.g. to get the first commit of acid-base-solutions' 1.2 branch that does not exist in main:
 *
 *   gitFirstDivergingCommit( 'acid-base-solutions', '1.2', 'main' )
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitImmutableExecute } from './gitMutex.js';
import { SHA } from '../browser-and-node/PerennialTypes.js';

/**
 * @param primaryTarget - Branch/SHA
 * @param secondaryTarget - Branch/SHA
 * @returns Resolves to the SHA
 */
export const gitFirstDivergingCommit = async (
  primaryTarget: string,
  secondaryTarget: string
): Promise<SHA> => {
  // NOTE: This was switched from `git log secondary..primary --reverse --pretty=oneline` due to totality performance
  // being horrible
  return gitImmutableExecute( [
    'rev-list',
    '--topo-order',
    '--reverse',
    `${secondaryTarget}...${primaryTarget}`
  ], '..' ).then( stdout => {
    return Promise.resolve( stdout.trim().split( '\n' )[ 0 ].trim().split( ' ' )[ 0 ] );
  } );
};
