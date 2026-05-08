// Copyright 2017-2026, University of Colorado Boulder

/**
 * Handling for writing JSON to a file.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import fs from 'fs/promises';
import winston from 'winston';

/**
 * Write JSON to a file
 *
 * @param file
 * @param content
 */
export const writeJSON = async( file: string, content: Object ): Promise<void> => {
  winston.debug( `Writing JSON to ${file}` );

  try {
    await fs.writeFile( file, JSON.stringify( content, null, 2 ) );
  }
  catch ( err ) {
    throw new Error( `Could not write to file: ${file} due to: ${err}` );
  }
};