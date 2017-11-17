// Copyright 2017, University of Colorado Boulder

/**
 * git checkout
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var winston = require( 'winston' );

/**
 * Executes git checkout
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - The SHA/branch/whatnot to check out
 * @param {Function} callback - callback( stdout: {string} ), called when done, and with the entire stdout output.
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, target, callback, errorCallback ) {
  winston.info( 'git checkout ' + target + ' on ' + repo );

  execute( 'git', [ 'checkout', target ], '../' + repo, callback, errorCallback );
};
