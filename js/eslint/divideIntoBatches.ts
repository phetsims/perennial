// Copyright 2024, University of Colorado Boulder
/**
 * Divides an array of repository names into batches based on specified rules:
 * - No batch contains more than 50 repositories.
 * - Preferably utilize all 6 processors by creating up to 6 batches when possible.
 *
 * @param originalRepos - Array of repository names.
 * @returns An array of batches, where each batch is an array of repository names.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default function( originalRepos: string[] ): string[][] {
  const N = originalRepos.length;
  const MAX_BATCH_SIZE = 50;
  const PROCESSOR_COUNT = 6;
  const batches: string[][] = [];

  if ( N === 0 ) {
    return batches; // Return empty array if no repositories
  }

  if ( N <= PROCESSOR_COUNT ) {
    // Create N batches, each with 1 repository
    for ( const repo of originalRepos ) {
      batches.push( [ repo ] );
    }
  }
  else if ( N <= PROCESSOR_COUNT * MAX_BATCH_SIZE ) {
    // Aim for 6 batches, distributing repositories as evenly as possible
    const baseSize = Math.floor( N / PROCESSOR_COUNT );
    const extra = N % PROCESSOR_COUNT;
    let start = 0;

    for ( let i = 0; i < PROCESSOR_COUNT; i++ ) {
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