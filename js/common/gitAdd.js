// Copyright 2017, University of Colorado Boulder

/**
 * git add
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var winston = require( 'winston' );

/**
 * Executes git add
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} file - The file to be added
 * @param {Function} callback - callback( stdout: {string} ), called when done, and with the entire stdout output.
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, file, callback, errorCallback ) {
  winston.info( 'git add ' + file + ' on ' + repo );

  execute( 'git', [ 'add', file ], '../' + repo, callback, errorCallback );
};
