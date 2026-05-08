// Copyright 2020-2026, University of Colorado Boulder

/**
 * Executes async functions on each element in an array.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

export const asyncForEach = async <T>(
  list: T[],
  f: ( t: T, index: number ) => Promise<void>
): Promise<void> => {
  let index = 0;
  for ( const item of list ) {
    await f( item, index++ );
  }
};
