// Copyright 2017, University of Colorado Boulder

/**
 * git pull
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var winston = require( 'winston' );

/**
 * Executes git pull
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Function} callback - callback( stdout: {string} ), called when done, and with the entire stdout output.
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, callback, errorCallback ) {
  winston.info( 'git pull on ' + repo );

  execute( 'git', [ 'pull' ], '../' + repo, callback, errorCallback );
};
