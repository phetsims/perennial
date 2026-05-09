// Copyright 2023-2026, University of Colorado Boulder

/**
 * npm update
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import { npmCommand } from './npmCommand.js';
import winston from 'winston';
import asyncMutex from 'async-mutex';
import fs from 'fs';

const mutex = new asyncMutex.Mutex();

export type NPMUpdateOptions = {
  minimal?: boolean;
};

export const getNpmInstallFlags = (
  options?: NPMUpdateOptions
): string[] => {
  const minimal = options?.minimal ?? true;

  return minimal ? [ '--audit=false', '--fund=false' ] : [];
};

/**
 * Executes an effective "npm install", ensuring that the node_modules versions match package.json (and the lock file if present).
 */
export const npmUpdateDirectory = async ( directory: string, options?: NPMUpdateOptions ): Promise<void> => {
  winston.info( `npm update in ${directory}` );

  const hasPackageLock = fs.existsSync( `${directory}/package-lock.json` );

  const flags = getNpmInstallFlags( options );

  // NOTE: Run these synchronously across all instances!
  await mutex.runExclusive( async () => {

    // If we have a package-lock.json, we can do the more efficient 'npm ci'
    if ( hasPackageLock ) {
      await execute( npmCommand, [ 'ci', ...flags ], directory );
    }
    // Otherwise use the legacy method.
    else {
      await execute( npmCommand, [ 'prune' ], directory );
      await execute( npmCommand, [ 'update' ], directory );
    }
  } );
};
