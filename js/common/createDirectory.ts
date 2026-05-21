// Copyright 2020-2026, University of Colorado Boulder

/**
 * Creates a directory at the given path
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import fs from 'fs';
import winston from 'winston';

export const createDirectory = async ( path: string ): Promise<void> => {
  if ( !fs.existsSync( path ) ) {
    winston.info( `Creating directory ${path}` );

    await fs.promises.mkdir( path, { recursive: true } );
  }
};
