// Copyright 2017, University of Colorado Boulder

/**
 * git push
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var winston = require( 'winston' );

/**
 * Executes git push
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} remoteBranch - The branch that is getting pushed to, e.g. 'master' or '1.0'
 * @param {Function} callback - callback( stdout: {string} ), called when done, and with the entire stdout output.
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, remoteBranch, callback, errorCallback ) {
  winston.info( 'git push on ' + repo + ' to ' + remoteBranch );

  execute( 'git', [ 'push', '-u', 'origin', remoteBranch ], '../' + repo, callback, errorCallback );
};
