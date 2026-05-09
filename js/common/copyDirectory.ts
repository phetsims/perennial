// Copyright 2020-2026, University of Colorado Boulder

/**
 * Copies a directory (recursively) to another location
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import ncp from 'ncp';
import winston from 'winston';

export const copyDirectory = (
  pathToCopy: string,
  location: string,
  options: ncp.Options & { stopOnErr: true }
): Promise<void> => {
  winston.info( `copying ${pathToCopy} into ${location}` );

  return new Promise( ( resolve, reject ) => {
    ncp.ncp( pathToCopy, location, options, err => {
      if ( err ) {
        reject( new Error( `copyDirectory error: ${err}` ) );
      }
      else {
        resolve();
      }
    } );
  } );
};