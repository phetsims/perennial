// Copyright 2017, University of Colorado Boulder

/**
 * The dependencies.json of a repository
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var fs = require( 'fs' );
var winston = require( 'winston' );

/**
 * Executes git checkout
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Function} callback - callback( dependencies: {Object} )
 * @param {Function} [errorCallback] - errorCallback( {*} error )
 */
module.exports = function( repo, callback, errorCallback ) {
  winston.info( 'getting dependencies.json for ' + repo );

  fs.readFile( '../' + repo + '/dependencies.json', 'utf8', function( fileError, fileData ) {
    if ( fileError ) {
      winston.error( 'failed dependencies.json read for ' + repo );
      errorCallback( fileError );
    }
    else {
      callback( JSON.parse( fileData ) );
    }
  } );
};
