// Copyright 2017, University of Colorado Boulder

/**
 * git commit
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var winston = require( 'winston' );

/**
 * Executes git commit
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} message - The message to include in the commit
 * @param {Function} callback - callback( stdout: {string} ), called when done, and with the entire stdout output.
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, message, callback, errorCallback ) {
  winston.info( 'git commit on ' + repo + ' with message:\n' + message );

  execute( 'git', [ 'commit', '-m', message ], '../' + repo, callback, errorCallback );
};
