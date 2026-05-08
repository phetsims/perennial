// Copyright 2020-2026, University of Colorado Boulder

/**
 * Sleeps for a certain number of milliseconds
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

export const sleep = async ( milliseconds: number ): Promise<void> => {
  return new Promise( ( resolve, reject ) => {
    setTimeout( resolve, milliseconds );
  } );
};
