// Copyright 2020, University of Colorado Boulder

/**
 * Deletes a path recursively
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

const rimraf = require( 'rimraf' );
const winston = require( 'winston' );

/**
 * Deletes a path recursively
 * @public
 *
 * @param {string} path - The path to delete recursively
 * @returns {Promise}
 */
module.exports = function( path ) {
  winston.info( `Deleting directory ${path}` );

  return new Promise( ( resolve, reject ) => {
    rimraf( path, err => {
      if ( err ) {
        reject( `rimraf: ${err}` );
      }
      else {
        resolve();
      }
    } );
  } );
};
