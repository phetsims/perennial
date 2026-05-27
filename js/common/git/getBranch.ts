// Copyright 2026, University of Colorado Boulder

/**
 * Returns the branch (if any) that totality is on
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitImmutableExecute } from './gitMutex.js';
import { Branch } from '../../browser-and-node/PerennialTypes.js';

export const getBranch = async ( directory = '..' ): Promise<Branch> => {
  return gitImmutableExecute( [ 'symbolic-ref', '-q', 'HEAD' ], directory ).then( stdout => stdout.trim().replace( 'refs/heads/', '' ) );
};
