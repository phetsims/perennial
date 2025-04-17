// Copyright 2025, University of Colorado Boulder

/**
 * Instead of mapping an entire list to an async task all in one sync step, split it up into chunk sizes, with a sleep
 * step. Solves a bug in OpenSSL for windows git pulling, see https://github.com/phetsims/perennial/issues/361
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import _ from 'lodash';
import sleep from '../sleep.js';

// Use these parameters to prevent the `OpenSSL SSL_read: SSL_ERROR_SYSCALL, errno 0` for your case. It will often
// depend on the exact git commands you are running, and how many commands you are trying to run in parallel.
type ChunkDelayedOptions = {
  chunkSize: number;
  waitPerItem: number; // in ms
};

const chunkDelayed = async <T, K>( list: T[],
                                   callback: ( item: T ) => Promise<K>,
                                   providedOptions?: Partial<ChunkDelayedOptions> ): Promise<Awaited<K>[]> => {
  const options: ChunkDelayedOptions = _.assignIn( {
    chunkSize: 8,
    waitPerItem: 70
  }, providedOptions );

  const chunks = _.chunk( list, options.chunkSize );
  const waitTime = chunks[ 0 ].length * options.waitPerItem;// ms
  const resultPromises = [];
  for ( const chunk of chunks ) {
    const promises = chunk.map( callback );
    resultPromises.push( ...promises );

    // No need to sleep on the last one
    chunks.indexOf( chunk ) !== chunks.length - 1 && await sleep( waitTime );
  }

  return Promise.all( resultPromises );
};

export default chunkDelayed;