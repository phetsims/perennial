// Copyright 2020-2026, University of Colorado Boulder

/**
 * Deletes a path recursively
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

export const deleteDirectory = async ( path: string ): Promise<void> => {
  winston.info( `Deleting directory ${path}` );

  await execute( 'rm', [ '-Rf', path ], '../' );
};
