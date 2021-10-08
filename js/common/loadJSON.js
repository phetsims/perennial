// Copyright 2017, University of Colorado Boulder

/**
 * Handling for loading JSON from a file.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const fs = require( 'fs' );
const winston = require( 'winston' );

/**
 * Load JSON from a file, resulting in the parsed result.
 * @public
 *
 * @param {string} file
 * @returns {Promise} - Resolves with {Object} - Result of JSON.parse
 */
module.exports = function( file ) {
  return new Promise( ( resolve, reject ) => {
    winston.debug( `Loading JSON from ${file}` );

    fs.readFile( file, 'utf8', ( err, data ) => {
      if ( err ) {
        winston.error( `Error occurred reading version from json at ${file}: ${err}` );
        reject( new Error( err ) );
      }
      else {
        resolve( JSON.parse( data ) );
      }
    } );
  } );
};
