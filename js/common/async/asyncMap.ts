// Copyright 2020-2026, University of Colorado Boulder

/**
 * Returns an array mapped asynchronously
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

const asyncMap = async <T, U>( list: T[], f: ( t: T, index: number ) => Promise<U> ): Promise<U[]> => {
  const items = [];
  let index = 0;
  for ( const item of list ) {
    items.push( await f( item, index++ ) );
  }
  return items;
};

module.exports = asyncMap;