// Copyright 2017, University of Colorado Boulder

/**
 * npm update
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var npmCommand = require( './npmCommand' );
var winston = require( 'winston' );

/**
 * Executes an effective "npm update" (with pruning because it's required).
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Function} callback - callback( stdout: {string} ), called when done, and with the entire stdout output.
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, callback, errorCallback ) {
  winston.info( 'npm update on ' + repo );

  execute( npmCommand, [ 'prune' ], '../' + repo, function() {
    execute( npmCommand, [ 'update' ], '../' + repo, callback, errorCallback );
  }, errorCallback );
};
