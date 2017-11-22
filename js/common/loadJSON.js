// Copyright 2017, University of Colorado Boulder

/**
 * Handling for loading JSON from a file.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var fs = require( 'fs' );
var winston = require( 'winston' );

/**
 * Load JSON from a file, resulting in the parsed result.
 * @public
 *
 * @param {string} file
 * @returns {Promise} - Resolves with {Object} - Result of JSON.parse
 */
module.exports = function( file ) {
  return new Promise( ( resolve, reject ) => {
    winston.debug( 'Loading JSON from ' + file );

    fs.readFile( file, 'utf8', function( err, data ) {
      if ( err ) {
        winston.error( 'Error occurred reading version from json at ' + file + ': ' + err );
        reject( err );
      }
      else {
        resolve( JSON.parse( data ) );
      }
    } );
  } );
};
