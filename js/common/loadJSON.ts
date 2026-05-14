// Copyright 2017-2026, University of Colorado Boulder

/**
 * Handling for loading JSON from a file.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import fs from 'fs';
import winston from 'winston';
import { IntentionalPerennialAny } from '../browser-and-node/PerennialTypes.js';

/**
 * Load JSON from a file, resulting in the parsed result.
 *
 * @param file
 * @returns - Resolves with {Object} - Result of JSON.parse
 */
export const loadJSON = async (
  file: string
): Promise<IntentionalPerennialAny> => {
  return new Promise( ( resolve, reject ) => {
    winston.debug( `Loading JSON from ${file}` );

    fs.readFile( file, 'utf8', ( err, data ) => {
      if ( err ) {
        winston.error( `Error occurred reading version from json at ${file}: ${err}` );
        reject( new Error( `${err}` ) );
      }
      else {
        resolve( JSON.parse( data ) );
      }
    } );
  } );
};
