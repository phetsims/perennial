// Copyright 2017, University of Colorado Boulder

/**
 * Command execution wrapper (with common settings)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

const child_process = require( 'child_process' );
const winston = require( 'winston' );


/**
 * Executes a command, with specific arguments and in a specific directory (cwd).
 * @public
 *
 * Resolves with the stdout: {string}
 * Rejects with { code: {number}, stdout: {string} } -- Happens if the exit code is non-zero.
 *
 * @param {string} cmd - The process to execute. Should be on the current path.
 * @param {Array.<string>} args - Array of arguments. No need to extra-quote things.
 * @param {string} cwd - The working directory where the process should be run from
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( cmd, args, cwd ) {
  class ExecuteError extends Error {
    /**
     * @param {string} cmd
     * @param {Array.<string>} args
     * @param {string} cwd
     * @param {string} stdout
     * @param {string} stderr
     * @param {number} code - exit code
     */
    constructor( cmd, args, cwd, stdout, stderr, code ) {
      super( `${cmd} ${args.join( ' ')} in ${cwd} failed with exit code ${code} and stdout:\n${stdout}` );

      // @public
      this.cmd = cmd;
      this.args = args;
      this.cwd = cwd;
      this.stdout = stdout;
      this.stderr = stderr;
      this.code = code;
    }
  }
  
  return new Promise( ( resolve, reject ) => {
    const process = child_process.spawn( cmd, args, {
      cwd: cwd
    } );
    winston.debug( `running ${cmd} ${args.join( ' ' )} from ${cwd}` );

    let stdout = ''; // to be appended to
    let stderr = '';

    process.stderr.on( 'data', data => {
      stderr += data;
      winston.debug( 'stderr: ' + data );
    } );
    process.stdout.on( 'data', data => {
      stdout += data;
      winston.debug( 'stdout: ' + data );
    } );

    process.on( 'close', code => {
      if ( code !== 0 ) {
        reject( new ExecuteError( cmd, args, cwd, stdout, stderr, code ) );
      }
      else {
        resolve( stdout );
      }
    } );
  } );
};
