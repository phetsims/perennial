// Copyright 2020, University of Colorado Boulder

/**
 * Copies a directory (recursively) to another location
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const ncp = require( 'ncp' );
const winston = require( 'winston' );

/**
 * Copies a directory (recursively) to another location
 * @public
 *
 * @param {string} path
 * @param {string} location
 * @param {Object} [options]
 * @returns {Promise}
 */
module.exports = function( pathToCopy, location, options ) {
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
