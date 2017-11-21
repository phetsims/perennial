// Copyright 2017, University of Colorado Boulder

/**
 * Returns the version of the current checked-in repo's package.json
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
// var execute = require( './execute' );
var winston = require( 'winston' );

/**
 * Returns the version for a current checked-in repo
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

  //TODO
};
