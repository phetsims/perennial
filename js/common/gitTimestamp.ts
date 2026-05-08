// Copyright 2021-2026, University of Colorado Boulder

/**
 * Provides the timestamp of any git target (branch/SHA)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';

/**
 * Provides the timestamp of any git target (branch/SHA)
 *
 * @param target - Branch/SHA
 * @returns - Resolves to the timestamp (epoch milliseconds)
 */
export const gitTimestamp = async ( target: string ): Promise<number> => {
  return execute( 'git', [ 'show', '-s', '--format=%cd', '--date=iso', target ], '..' ).then( stdout => {
    return Promise.resolve( new Date( stdout.trim() ).getTime() );
  } );
};