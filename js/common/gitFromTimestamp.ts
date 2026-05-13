// Copyright 2018-2026, University of Colorado Boulder

/**
 * git rev-list -1 --before="{{TIMESTAMP}}" {{BRANCH}}
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitImmutableExecute } from './gitMutex.js';

/**
 * Gets the best SHA from a given branch at the given timestamp
 *
 * @param repo - The repository name
 * @param branch - The SHA/branch/whatnot to check out
 * @param timestamp
 * @returns - Resolves to the SHA
 */
export const gitFromTimestamp = async(
  branch: string,
  timestamp: string
): Promise<string> => {
  return gitImmutableExecute( [ 'rev-list', '-1', `--before="${timestamp}"`, branch ], '..' ).then( stdout => {
    const sha = stdout.trim();
    if ( sha.length === 0 ) {
      return Promise.reject( new Error( 'No matching SHA for timestamp' ) );
    }
    else {
      return Promise.resolve( sha );
    }
  } );
};
