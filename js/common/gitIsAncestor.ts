// Copyright 2017-2026, University of Colorado Boulder

/**
 * Whether a git commit is an ancestor of another (in totality)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

export const gitIsAncestor = async (
  possibleAncestor: string,
  possibleDescendant: string,
): Promise<boolean> => {
  winston.info( `git check for whether ${possibleAncestor} is an ancestor of ${possibleDescendant}` );

  return execute( 'git', [ 'merge-base', '--is-ancestor', possibleAncestor, possibleDescendant ], '..' ).then( stdout => Promise.resolve( true ), mergeError => {
    if ( mergeError.code === 1 ) {
      return Promise.resolve( false );
    }
    else {
      return Promise.reject( mergeError );
    }
  } );
};
