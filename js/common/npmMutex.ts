// Copyright 2026, University of Colorado Boulder

/**
 * A Mutex object for locking out npm commands (particularly mutable NPM commands)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { Mutex } from 'async-mutex';

export const npmMutex = new Mutex();

// TODO: use this everywhere it is needed
export const npmExclusive = async <T>(
  callback: () => Promise<T>
): Promise<T> => {
  return await npmMutex.runExclusive( callback );
};