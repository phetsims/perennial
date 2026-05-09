// Copyright 2017-2026, University of Colorado Boulder

/**
 * Copies a single file.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import fs from 'fs';
import winston from 'winston';

export const copyFile = (
  sourceFilename: string,
  destinationFilename: string
): Promise<void> => {
  return new Promise( ( resolve, reject ) => {
    winston.info( `Copying ${sourceFilename} to ${destinationFilename}` );

    const readStream = fs.createReadStream( sourceFilename );
    const writeStream = fs.createWriteStream( destinationFilename );
    readStream.pipe( writeStream );
    readStream.on( 'end', () => resolve() );
    readStream.on( 'error', err => reject( new Error( `${err}` ) ) );
    writeStream.on( 'error', err => reject( new Error( `${err}` ) ) );
  } );
};