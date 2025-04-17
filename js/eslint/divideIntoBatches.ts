// Copyright 2024, University of Colorado Boulder

/**
 * Divides an array of repository names into batches based on specified rules:
 * - No batch contains more than MAX_BATCH_SIZE repositories.
 * - Preferably utilize all PROCESS_COUNT processors by creating up to PROCESS_COUNT batches when possible.
 *
 * @param originalRepos - Array of repository names.
 * @returns An array of batches, where each batch is an array of repository names.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import os from 'os';
import { Repo } from '../browser-and-node/PerennialTypes.js';

const MAX_BATCH_SIZE = 50;

export default function divideIntoBatches( originalRepos: Repo[], maxProcesses: number ): Repo[][] {

  const N = originalRepos.length;

  // Use most of the processors. for instance, on Macbook air m1, we have 8 cores and we use 6, which has good performance
  const numCPUs = os.cpus().length; // as of 11/2024 -- MK: 20, SR: 16, sparky: 128
  const processCount = Math.min( Math.round( numCPUs / 4 ), maxProcesses );

  const batches: Repo[][] = [];

  if ( N === 0 ) {
    return batches; // Return empty array if no repositories
  }

  if ( N <= processCount ) {

    // Create N batches, each with 1 repository
    for ( const repo of originalRepos ) {
      batches.push( [ repo ] );
    }
  }
  else if ( N <= processCount * MAX_BATCH_SIZE ) {

    // Aim for 6 batches, distributing repositories as evenly as possible
    const baseSize = Math.floor( N / processCount );
    const extra = N % processCount;
    let start = 0;

    for ( let i = 0; i < processCount; i++ ) {

      // Distribute the extra repositories one by one to the first 'extra' batches
      const batchSize = baseSize + ( i < extra ? 1 : 0 );
      const end = start + batchSize;
      batches.push( originalRepos.slice( start, end ) );
      start = end;
    }
  }
  else {

    // Create as many batches of 50 as needed
    for ( let i = 0; i < N; i += MAX_BATCH_SIZE ) {
      batches.push( originalRepos.slice( i, i + MAX_BATCH_SIZE ) );
    }
  }

  return batches;
}