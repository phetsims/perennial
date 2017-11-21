// Copyright 2017, University of Colorado Boulder

/**
 * Returns the version of the current checked-in repo's package.json
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var fs = require( 'fs' );
var SimVersion = require( './SimVersion' );
var winston = require( 'winston' );

/**
 * Returns the version for a current checked-in repo
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Function} callback - callback( version: {SimVersion} )
 * @param {Function} [errorCallback] - errorCallback( message: {string} )
 */
module.exports = function( repo, callback, errorCallback ) {
  winston.debug( 'Reading version from package.json for ' + repo );

  fs.readFile( '../' + repo + '/package.json', 'utf8', function( err, data ) {
    if ( err ) {
      winston.error( 'Error occurred reading version from package.json: ' + err );
      if ( errorCallback ) {
        errorCallback( err );
        return;
      }
      else {
        throw err;
      }
    }

    callback( SimVersion.parse( JSON.parse( data ).version ) );
  } );
};
