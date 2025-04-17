// Copyright 2024, University of Colorado Boulder

/**
 * General function for running N async callbacks at once, one per item provided in the list. The callback will
 * be executed on the items in the order of the list (first->last).
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */

import _ from 'lodash';

type CallbackOnWorkers = {
  workers?: number; // How many workers to use
};


async function callbackOnWorkers<T>( items: T[], callback: ( item: T ) => Promise<void>, providedOptions?: CallbackOnWorkers ): ReturnType<typeof Promise.allSettled> {

  const options = _.assignIn( {
    workers: 8
  }, providedOptions );

  /**
   * Worker function that continuously processes repositories from the queue.
   */
  const worker = async () => {

    while ( true ) {

      // Synchronize access to the queue
      // Since JavaScript is single-threaded, this is safe
      if ( items.length === 0 ) {
        break; // No more repositories to process
      }

      const item = items.shift()!; // Get the next repository

      await callback( item );
    }
  };

  // Wait for all workers to complete, allSettled means we don't throw on rejections
  return Promise.allSettled( _.times( options.workers, () => worker() ) );
}

export default callbackOnWorkers;