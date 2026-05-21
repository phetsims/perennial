// Copyright 2017-2026, University of Colorado Boulder

/**
 * Whether a git commit is an ancestor of another (in totality)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitImmutableExecute } from './gitMutex.js';

export const gitIsAncestor = async (
  possibleAncestor: string,
  possibleDescendant: string
): Promise<boolean> => {
  winston.debug( `git check for whether ${possibleAncestor} is an ancestor of ${possibleDescendant}` );

  return gitImmutableExecute( [ 'merge-base', '--is-ancestor', possibleAncestor, possibleDescendant ], '..' ).then( stdout => Promise.resolve( true ), mergeError => {
    if ( mergeError.code === 1 ) {
      return Promise.resolve( false );
    }
    else {
      return Promise.reject( mergeError );
    }
  } );
};
