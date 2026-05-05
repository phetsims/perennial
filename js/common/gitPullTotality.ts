// Copyright 2026, University of Colorado Boulder

/**
 * Pulls totality
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';

export const gitPullTotality = async (): Promise<void> => {
  await execute( 'git', [ 'pull' ], '..' );
};
