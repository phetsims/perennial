// Copyright 2018-2026, University of Colorado Boulder

/**
 * Checks whether we are somewhere that would have access to phet-server2.int.colorado.edu (implies access to bayes).
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

// eslint-disable-next-line phet/default-import-match-filename
import dns from 'dns/promises';

/**
 * Checks whether we are somewhere that would have access to phet-server2.int.colorado.edu (implies access to bayes).
 *
 * @returns - Whether the directory exists
 */
export const vpnCheck = async (): Promise<boolean> => {
  try {
    await dns.resolve( 'phet-server2.int.colorado.edu' );
    return true;
  }
  catch( err ) {
    return false;
  }
};