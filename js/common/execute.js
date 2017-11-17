// Copyright 2017, University of Colorado Boulder

/**
 * Command execution wrapper (with common settings)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var child_process = require( 'child_process' );
var winston = require( 'winston' );

/**
 * Executes a command, with specific arguments and in a specific directory (cwd).
 * @public
 *
 * If the command fails (exit code non-zero), the error override callback will be called (if available), otherwise
 * we default to the hard-error "halt everything" approach for safety.
 *
 * @param {string} cmd - The process to execute. Should be on the current path.
 * @param {Array.<string>} args - Array of arguments. No need to extra-quote things.
 * @param {string} cwd - The working directory where the process should be run from
 * @param {Function} callback - callback( stdout: {string} ), called when done, and with the entire stdout output.
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( cmd, args, cwd, callback, errorCallback ) {
  var process = child_process.spawn( cmd, args, {
    cwd: cwd
  } );
  winston.debug( 'running ' + cmd + ' ' + args.join( ' ' ) + ' from ' + cwd );

  var stdoutData = ''; // to be appended to

  process.stderr.on( 'data', data => winston.debug( 'stderr: ' + data ) );
  process.stdout.on( 'data', function( data ) {
    stdoutData += data;
    winston.debug( 'stdout: ' + data );
  } );

  process.on( 'close', function( code ) {
    if ( code !== 0 ) {
      if ( errorCallback ) {
        errorCallback( code, stdoutData );
      }
      else {
        throw new Error( 'failed to execute ' + cmd + ' with error code ' + code );
      }
    }
    else {
      callback( stdoutData );
    }
  } );
};
