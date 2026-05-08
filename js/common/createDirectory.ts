// Copyright 2020-2026, University of Colorado Boulder

/**
 * Creates a directory at the given path
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import fs from 'fs';
import winston from 'winston';

export const createDirectory = async ( path: string ): Promise<void> => {
  winston.info( `Creating directory ${path}` );

  return new Promise( ( resolve, reject ) => {
    fs.mkdir( path, { recursive: true }, err => {
      if ( err ) {
        reject( new Error( `createDirectory: ${err}` ) );
      }
      else {
        resolve();
      }
    } );
  } );
};
