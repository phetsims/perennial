// Copyright 2017, University of Colorado Boulder

/**
 * Command execution wrapper (with common settings)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

import child_process from 'child_process';
import winston from 'winston';
import _ from 'lodash';
import assert from 'assert';
import grunt from 'grunt';

/**
 * Executes a command, with specific arguments and in a specific directory (cwd).
 *
 * Resolves with the stdout: {string}
 * Rejects with { code: {number}, stdout: {string} } -- Happens if the exit code is non-zero.
 *
 * @param cmd - The process to execute. Should be on the current path.
 * @param args - Array of arguments. No need to extra-quote things.
 * @param cwd - The working directory where the process should be run from
 * @param [options]
 * @rejects {ExecuteError}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function( cmd: string, args: string[], cwd: string, options?: any ): Promise<string | { code: number; stdout: string; stderr: string; cwd: string; error?: Error; time: number }> {

  const startTime = Date.now();

  options = _.merge( {

    // {'reject'|'resolve'} - whether errors should be rejected or resolved.  If errors are resolved, then an object
    //                      - of the form {code:number,stdout:string,stderr:string} is returned. 'resolve' allows usage
    //                      - in Promise.all without exiting on the 1st failure
    errors: 'reject',

    // Provide additional env variables, and they will be merged with the existing defaults.
    // eslint-disable-next-line phet/no-object-spread-on-non-literals
    childProcessEnv: { ...process.env },

    // options.shell value to the child_process.spawn. shell:true is required for a NodeJS security update, see https://github.com/phetsims/perennial/issues/359
    // In this case, only bash scripts fail with an EINVAL error, so we don't need to worry about node/git (and in
    // fact don't want the overhead of a new shell).
    childProcessShell: cmd !== 'node' && cmd !== 'git' && process.platform.startsWith( 'win' )
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
      // @ts-expect-error
      grunt.log.debug( `stderr: ${data}` );
      winston.debug( `stderr: ${data}` );
    } );
    childProcess.stdout.on( 'data', data => {
      stdout += data;

      // @ts-expect-error
      grunt.log.debug( `stdout: ${data}` );
      winston.debug( `stdout: ${data}` );
    } );

    childProcess.on( 'close', code => {
      winston.debug( `Command ${cmd} finished. Output is below.` );

      winston.debug( stderr && `stderr: ${stderr}` || 'stderr is empty.' );
      winston.debug( stdout && `stdout: ${stdout}` || 'stdout is empty.' );

      if ( !rejectedByError ) {
        if ( options.errors === 'resolve' ) {

          // TODO: https://github.com/phetsims/perennial/issues/403 code! ?
          resolve( { code: code!, stdout: stdout, stderr: stderr, cwd: cwd, time: Date.now() - startTime } );
        }
        else {
          if ( code !== 0 ) {

            // TODO: https://github.com/phetsims/perennial/issues/403 code! ?
            reject( new ExecuteError( cmd, args, cwd, stdout, stderr, code!, Date.now() - startTime ) );
          }
          else {
            resolve( stdout );
          }
        }
      }
    } );
  } );
}

class ExecuteError extends Error {

  public constructor(
    public readonly cmd: string,
    public readonly args: string[],
    public readonly cwd: string,
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly code: number,
    public readonly time: number // ms
  ) {
    super( `${cmd} ${args.join( ' ' )} in ${cwd} failed with exit code ${code}${stdout ? `\nstdout:\n${stdout}` : ''}${stderr ? `\nstderr:\n${stderr}` : ''}` );
  }
}