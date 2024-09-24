// Copyright 2024, University of Colorado Boulder

/**
 * Script to automate the setup and execution of a development server and a transpiler.
 *
 * The script performs the following tasks:
 * 1. Pulls all repos, missing repos, performs npm updates, unless skipped with --skipPull.
 * 2. Starts an HTTP server.
 * 3. Starts a watch-mode transpiler once the server is up.
 * 4. Handles graceful termination of both processes on receiving termination signals.
 *
 * Run this from your root level directory containing all PhET repositories.
 * Example usage:
 * node perennial/js/scripts/start-dev.js
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

// eslint-disable-next-line require-statement-match
const { spawn, exec } = require( 'child_process' );
const path = require( 'path' );

// It takes a long time to pull all repos. This option skips that step for faster startup.
const skipPull = process.argv.includes( '--skipPull' );

// References to the child processes so that they can be terminated gracefully.
let httpServerProcess;
let transpileProcess;

/**
 * Helper function to run a command and return a promise that resolves/rejects based on the command's execution.
 *
 * @param {string} command - The command to run.
 * @param {Object} [options] - Options to pass to exec.
 * @returns {Promise} - Resolves with stdout if the command succeeds, else rejects with error details.
 */
function runCommand( command, options = {} ) {
  return new Promise( ( resolve, reject ) => {
    const childProcess = exec( command, options, ( error, stdout, stderr ) => {
      if ( error ) {
        reject( error );
      }
      else {
        resolve( stdout );
      }
    } );

    // Pipe the child process output to parent process's stdout and stderr
    childProcess.stdout.on( 'data', data => process.stdout.write( data ) );
    childProcess.stderr.on( 'data', data => process.stderr.write( data ) );
  } );
}

/**
 * Terminates the child processes gracefully.
 *
 * @param {string} signal - The signal used to terminate the processes.
 */
function terminateProcesses( signal ) {
  if ( httpServerProcess ) {
    console.log( `Terminating http-server process with ${signal} signal...` );
    httpServerProcess.kill( signal );
  }
  if ( transpileProcess ) {
    console.log( `Terminating transpile process with ${signal} signal...` );
    transpileProcess.kill( signal );
  }
}

/**
 * Main function to orchestrate the script logic.
 */
async function main() {
  try {

    // The root directory where phet repos are located, relative to this script.
    const phetsimsDirectory = path.join( __dirname, '../../../' );

    if ( !skipPull ) {
      console.log( '\nUpdating code base, installing dependencies. This may take several minutes. You can skip this step with --skipPull option.' );
      await runCommand( 'node js/scripts/main-pull-status.js --all --slowPull', { cwd: path.join( phetsimsDirectory, 'perennial' ) } );
    }
    else {
      console.log( '\nSkipping pull step.' );
    }

    console.log( '\nStarting http-server...\n' );
    httpServerProcess = spawn( 'http-server', [], { shell: true } );

    // Monitor the HTTP server's output for the URL to know when it's started
    httpServerProcess.stdout.on( 'data', data => {
      process.stdout.write( `${data}` );
      if ( data.toString().includes( 'http://' ) ) {
        console.log( '\nStarting the transpiler...\n' );
        transpileProcess = spawn( 'node', [ 'js/scripts/transpile.js', '--watch' ], { cwd: path.join( phetsimsDirectory, 'chipper' ) } );

        transpileProcess.stdout.on( 'data', data => process.stdout.write( `transpile: ${data}` ) );
        transpileProcess.stderr.on( 'data', data => process.stderr.write( `transpile: ${data}` ) );
      }
    } );

    httpServerProcess.stderr.on( 'data', data => process.stderr.write( `http-server: ${data}` ) );

    httpServerProcess.on( 'error', error => {
      console.error( 'Failed to start http-server:', error );
      process.exit( 1 );
    } );

  }
  catch( error ) {
    console.error( 'Error: ', error.stderr || error );
  }
}

// Handle termination signals for graceful shutdown
[ 'SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT' ].forEach( signal => {
  process.on( signal, () => {
    console.log( `\nReceived ${signal}. Initiating shutdown...` );
    terminateProcesses( signal );
    process.exit();
  } );
} );

main();