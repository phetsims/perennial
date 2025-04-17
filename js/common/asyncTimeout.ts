// Copyright 2025, University of Colorado Boulder

/**
 * Returns a Promise that resolves either from the provided Promise, or from a timeout Promise that rejects after the
 * provided time (in ms).
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import sleep from './sleep.js';

// When using "catch" around asyncTimeout, you can see if this is the error message and handle it differently than a
// problem from the provided Promise.
export const timeoutErrorMessage = 'TIMEOUT_ERROR';

const asyncTimeout = async <T>( timeout: number, promise: Promise<T> ): Promise<T> => {

  const timeoutPromise = ( async () => {
    await sleep( timeout );
    throw new Error( timeoutErrorMessage );
  } )();

  return Promise.race( [ promise, timeoutPromise ] );
};

export default asyncTimeout;