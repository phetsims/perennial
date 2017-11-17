// Copyright 2017, University of Colorado Boulder

/**
 * git cherry-pick (but if it fails, it will back out of the cherry-pick)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var winston = require( 'winston' );

/**
 * Executes git cherry-pick (but if it fails, it will back out of the cherry-pick)
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - The SHA/branch/whatnot to check out
 * @param {Function} callback - callback( succeeded: {boolean} ), called when done
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, target, callback, errorCallback ) {
  winston.info( 'git cherry-pick ' + target + ' on ' + repo );

  execute( 'git', [ 'cherry-pick', target ], '../' + repo, function() {
    callback( true ); // success!
  }, function( code, stdout ) {
    winston.info( 'git cherry-pick failed (aborting): ' + target + ' on ' + repo );
    execute( 'git', [ 'cherry-pick', '--abort' ], '../' + repo, function() {
      callback( false ); // failure, but we were able to abort it!
    }, function( abortCode, abortStdout ) {
      winston.error( 'git cherry-pick --abort failed: ' + target + ' on ' + repo );
      errorCallback( code, stdout );
    } );
  } );
};
