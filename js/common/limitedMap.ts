// Copyright 2026, University of Colorado Boulder

/**
 * A concurrency-limited version of map, which will only run a certain number of promises at once.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import pLimit from 'p-limit';

export const limitedMap = async <T, U>( list: T[], f: ( t: T ) => Promise<U>, concurrentLimit: number ): Promise<U[]> => {
  const limit = pLimit( concurrentLimit );

  return Promise.all( list.map( item => limit( async () => f( item ) ) ) );
};

