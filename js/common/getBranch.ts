// Copyright 2026, University of Colorado Boulder

/**
 * Returns the branch (if any) that totality is on
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitImmutableExecute } from './gitMutex.js';

export const getBranch = async (): Promise<string> => {
  return gitImmutableExecute( [ 'symbolic-ref', '-q', 'HEAD' ], '..' ).then( stdout => stdout.trim().replace( 'refs/heads/', '' ) );
};
