// Copyright 2020-2026, University of Colorado Boulder

/**
 * Returns an array filtered asynchronously
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

export const asyncFilter = async <T>(
  list: T[],
  f: ( t: T ) => Promise<T>
) => {
  const items = [];
  for ( const item of list ) {
    if ( await f( item ) ) {
      items.push( item );
    }
  }
  return items;
};