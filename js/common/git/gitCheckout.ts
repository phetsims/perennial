// Copyright 2017-2026, University of Colorado Boulder

/**
 * git checkout
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitCheckoutDirectory } from './gitCheckoutDirectory.js';

/**
 * Executes git checkout
 *
 * @param target - The SHA/branch/whatnot to check out
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const gitCheckout = async ( target: string ): Promise<string> => {
  return gitCheckoutDirectory( target, '..' );
};
