// Copyright 2021-2026, University of Colorado Boulder

/**
 * Provides the SHA of the last shared ancestor commit between two targets (branches/SHAs)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitImmutableExecute } from './gitMutex.js';

/**
 * Provides the SHA of the last shared ancestor commit between two targets (branches/SHAs)
 *
 * @param  targetA - Branch/SHA
 * @param  targetB - Branch/SHA
 * @returns Resolves to the SHA
 */
export const gitLastSharedAncestor = async ( targetA: string, targetB: string ): Promise<string> => {
  return gitImmutableExecute( [ 'merge-base', targetA, targetB ], '..' ).then( stdout => {
    return Promise.resolve( stdout.trim() );
  } );
};
