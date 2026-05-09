// Copyright 2018-2026, University of Colorado Boulder

/**
 * Checks whether access to the dev server is available (usually unavailable if not on VPN or on campus)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { devSsh } from './devSsh.js';

/**
 * Checks whether access to the dev server is available (usually unavailable if not on VPN or on campus)
 *
 * @returns Whether the directory exists
 */
export const devAccessAvailable = async (): Promise<boolean> => {
  try {
    await devSsh( 'ls' );
    return true;
  }
  catch( e ) {
    return false;
  }
};