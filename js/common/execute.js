// Copyright 2017, University of Colorado Boulder

/**
 * Command execution wrapper (with common settings)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const child_process = require( 'child_process' );
const winston = require( 'winston' );
const _ = require( 'lodash' );
const assert = require( 'assert' );
const grunt = require( 'grunt' );

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
 * @param {Object} [options]
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( cmd, args, cwd, options ) {
  // TODO: Commit this at some point? https://github.com/phetsims/chipper/issues/1481
  // assert( cmd !== 'node', 'our NodeJS code supports typescript now, please use tsx as a runnable using "tsxCommand"');

  const startTime = Date.now();

  options = _.merge( {

    // {'reject'|'resolve'} - whether errors should be rejected or resolved.  If errors are resolved, then an object
    //                      - of the form {code:number,stdout:string,stderr:string} is returned. 'resolve' allows usage
    //                      - in Promise.all without exiting on the 1st failure
    errors: 'reject',

    // Provide additional env variables, and they will be merged with the existing defaults.
    childProcessEnv: { ...process.env },

    // options.shell value to the child_process.spawn. shell:true is required for a NodeJS security update, see https://github.com/phetsims/perennial/issues/359
    // In this case, only bash scripts fail with an EINVAL error, so we don't need to worry about node/git (and in
    // fact don't want the overhead of a new shell).
    childProcessShell: cmd !== 'node' && cmd !== 'git' && /^win/.test( process.platform )
  }, options );
  assert( options.errors === 'reject' || options.errors === 'resolve', 'Errors must reject or resolve' );

  return new Promise( ( resolve, reject ) => {

    let rejectedByError = false;

    let stdout = ''; // to be appended to
    let stderr = '';

    const childProcess = child_process.spawn( cmd, args, {
      cwd: cwd,
      env: options.childProcessEnv,
      shell: options.childProcessShell
    } );

    childProcess.on( 'error', error => {
      rejectedByError = true;

      if ( options.errors === 'resolve' ) {
        resolve( { code: 1, stdout: stdout, stderr: stderr, cwd: cwd, error: error, time: Date.now() - startTime } );
      }
      else {
        reject( new ExecuteError( cmd, args, cwd, stdout, stderr, -1, Date.now() - startTime ) );
      }
    } );
    winston.debug( `Running ${cmd} ${args.join( ' ' )} from ${cwd}` );

    childProcess.stderr.on( 'data', data => {
      stderr += data;
      grunt.log.debug( `stderr: ${data}` );
      winston.debug( `stderr: ${data}` );
    } );
    childProcess.stdout.on( 'data', data => {
      stdout += data;
      grunt.log.debug( `stdout: ${data}` );
      winston.debug( `stdout: ${data}` );
    } );

    childProcess.on( 'close', code => {
      winston.debug( `Command ${cmd} finished. Output is below.` );

      winston.debug( stderr && `stderr: ${stderr}` || 'stderr is empty.' );
      winston.debug( stdout && `stdout: ${stdout}` || 'stdout is empty.' );

      if ( !rejectedByError ) {
        if ( options.errors === 'resolve' ) {
          resolve( { code: code, stdout: stdout, stderr: stderr, cwd: cwd, time: Date.now() - startTime } );
        }
        else {
          if ( code !== 0 ) {
            reject( new ExecuteError( cmd, args, cwd, stdout, stderr, code, Date.now() - startTime ) );
          }
          else {
            resolve( stdout );
          }
        }
      }
    } );
  } );
};

class ExecuteError extends Error {

  /**
   * @param {string} cmd
   * @param {Array.<string>} args
   * @param {string} cwd
   * @param {string} stdout
   * @param {string} stderr
   * @param {number} code - exit code
   * @param {number} time - ms
   */
  constructor( cmd, args, cwd, stdout, stderr, code, time ) {
    super( `${cmd} ${args.join( ' ' )} in ${cwd} failed with exit code ${code}${stdout ? `\nstdout:\n${stdout}` : ''}${stderr ? `\nstderr:\n${stderr}` : ''}` );

    // @public
    this.cmd = cmd;
    this.args = args;
    this.cwd = cwd;
    this.stdout = stdout;
    this.stderr = stderr;
    this.code = code;
    this.time = time;
  }
}