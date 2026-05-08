// Copyright 2020-2026, University of Colorado Boulder

/**
 * Provides the timestamp of the latest commit
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';

/**
 * Provides the timestamp of the latest commit
 *
 * @returns Resolves to the timestamp (getTime() --- i.e. milliseconds)
 */
export const gitLastCommitTimestamp = async (): Promise<number> => {
  return execute( 'git', [ 'log', '-1', '--pretty=format:%cd', '--date=iso' ], '..' ).then( stdout => {
    return Promise.resolve( new Date( stdout.trim() ).getTime() );
  } );
};
