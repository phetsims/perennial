// Copyright 2026, University of Colorado Boulder

/**
 * Returns the branch (if any) that totality is on
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';

export const getBranch = async (): Promise<string> => {
  return execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], '..' ).then( stdout => stdout.trim().replace( 'refs/heads/', '' ) );
};
