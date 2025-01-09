// Copyright 2024, University of Colorado Boulder

/**
 * Script to clone repositories, install dependencies, transpile code, and start an HTTP server.
 *
 * The script performs the following steps:
 * 1. Clones any missing repositories.
 * 2. Installs NPM dependencies in specified directories.
 * 3. Starts the transpiler (`grunt transpile --live`) and monitors its output.
 * 4. Once initial transpiling is complete, starts the HTTP server (`http-server -p 80 -c`).
 * 5. Handles process lifecycle to keep both the transpiler and HTTP server running.
 *
 * TODO: https://github.com/phetsims/chipper/issues/1345
 * "update-v1": "npm install && bash bin/sage run js/scripts/update-v1.ts && npm run start-v1",
 * "start-v1": "npm install && bash bin/sage run js/scripts/start-v1.ts",
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import cloneMissingRepos from '../common/cloneMissingRepos.js';
import execute from '../common/execute.js';
import npmCommand from '../common/npmCommand.js';

// Log initial messages
console.log( 'hello' );
console.log( 'done cloning' );

// Configuration
const phetsimsDirectory = path.join( __dirname, '../../../' );
const chipperDir = path.join( phetsimsDirectory, 'chipper' );
const perennialAliasDir = path.join( phetsimsDirectory, 'perennial-alias' );
const transpileCwd = path.join( phetsimsDirectory, 'chipper' );

// State variables to track transpiling progress
let totalChunks = 0;
let successfulChunks = 0;
let httpServerStarted = false;

// References to child processes for graceful shutdown
let transpileProcess: ChildProcess | null = null;
let httpServerProcess: ChildProcess | null = null;

/**
 * Starts the HTTP server using `http-server`.
 */
/**
 * Starts the HTTP server using `http-server` and ensures custom messages are printed last.
 */
function startHttpServer(): void {
  console.log( '\nStarting http-server...\n' );

  httpServerProcess = spawn( 'http-server', [ '..', '-p', '80', '-c' ], {
    shell: true,
    stdio: [ 'ignore', 'pipe', 'pipe' ] // Use 'pipe' to capture stdout and stderr
  } );

  // Listen to stdout data
  if ( httpServerProcess.stdout ) {
    httpServerProcess.stdout.on( 'data', data => {
      const output = data.toString();

      // Check if the server has started by looking for the specific message
      if ( data.includes( 'Hit CTRL-C to stop the server' ) ) {

        process.stdout.write( output ); // Pipe to parent stdout

        // Print the custom message after the server has fully started
        console.log( 'Open http://localhost/phetmarks in your browser to view the sims.' );
      }
    } );
  }

  // Listen to stderr data and pipe to parent stderr
  if ( httpServerProcess.stderr ) {
    httpServerProcess.stderr.on( 'data', data => {
      const errorOutput = data.toString();
      process.stderr.write( errorOutput );
    } );
  }

  // Handle HTTP server process events
  httpServerProcess.on( 'error', error => {
    console.error( 'HTTP server process error:', error );
    process.exit( 1 );
  } );

  httpServerProcess.on( 'exit', ( code, signal ) => {
    if ( code !== null ) {
      console.log( `HTTP server exited with code ${code}` );
      process.exit( code );
    }
    else {
      console.log( `HTTP server was killed by signal ${signal}` );
      process.exit( 1 );
    }
  } );

  httpServerStarted = true;

  console.log( 'http server started' );
  // Remove the immediate console.log to prevent it from appearing before server messages
  // console.log('Open http://localhost/phetmarks in your browser to view the sims.');
}

/**
 * Starts the transpiler using `grunt transpile --live` and monitors its output.
 */
function startTranspiler(): void {
  console.log( '\nStarting the transpiler...\n' );

  transpileProcess = spawn( 'bash', [ '../perennial/bin/sage', 'run', 'js/grunt/tasks/transpile.ts', '--live' ], {
    cwd: transpileCwd,
    shell: true,
    stdio: [ 'ignore', 'pipe', 'pipe' ] // Pipe stdout and stderr for monitoring
  } );

  // Handle transpiler process events
  transpileProcess.on( 'error', error => {
    console.error( 'Transpiler process error:', error );
    process.exit( 1 );
  } );

  transpileProcess?.stdout?.on( 'data', data => {
    const output = data.toString();
    process.stdout.write( `transpile: ${output}` );

    // Parse the number of chunks
    const splitMatch = output.match( /split into (\d+) chunks/ );
    if ( splitMatch && splitMatch[ 1 ] ) {
      totalChunks = parseInt( splitMatch[ 1 ], 10 );
      console.log( `Detected ${totalChunks} chunks for transpiling.` );
    }

    // Parse successful compilations
    const successMatch = output.includes( 'Watching' );
    if ( successMatch ) {
      successfulChunks += 1;
      console.log( `Chunk ${successfulChunks} compiled successfully.` );

      // If all chunks are compiled, start the HTTP server
      if ( totalChunks > 0 && successfulChunks === totalChunks && !httpServerStarted ) {
        console.log( 'All chunks compiled successfully. Starting HTTP server...' );
        startHttpServer();
      }
    }
  } );

  transpileProcess?.stderr?.on( 'data', data => {
    const errorOutput = data.toString();
    process.stderr.write( `transpile stderr: ${errorOutput}` );
  } );

  transpileProcess.on( 'exit', ( code, signal ) => {
    if ( code !== 0 ) {
      console.error( `Transpiler exited with code ${code} and signal ${signal}` );
      process.exit( code );
    }
    else {
      console.log( 'Transpiler exited successfully.' );
      process.exit( 0 );
    }
  } );
}

/**
 * Handles graceful shutdown of child processes upon receiving termination signals.
 */
function setupGracefulShutdown(): void {
  const shutdown = () => {
    console.log( '\nShutting down gracefully...' );

    if ( transpileProcess ) {
      transpileProcess.kill();
    }

    if ( httpServerProcess ) {
      httpServerProcess.kill();
    }

    process.exit( 0 );
  };

  // Listen for termination signals
  process.on( 'SIGINT', shutdown );
  process.on( 'SIGTERM', shutdown );
}

/**
 * Main asynchronous function to orchestrate cloning, installing, transpiling, and serving.
 */
( async () => {
  try {
    setupGracefulShutdown();

    // Clone missing repositories
    console.log( 'Cloning missing repositories...' );
    const cloned = await cloneMissingRepos( true );
    console.log( 'Cloned repositories:', cloned );

    // Install NPM dependencies in ../chipper
    console.log( '\nInstalling npm dependencies for chipper...' );
    await execute( npmCommand, [ 'install' ], chipperDir );
    console.log( 'NPM dependencies for chipper installed successfully.' );

    // Install NPM dependencies in ../perennial-alias
    console.log( '\nInstalling npm dependencies for perennial-alias...' );
    await execute( npmCommand, [ 'install' ], perennialAliasDir );
    console.log( 'NPM dependencies for perennial-alias installed successfully.' );

    // Start the transpiler and monitor its output
    startTranspiler();

    // Keep the main process alive
    await new Promise( () => {
      // Do nothing, the process will be kept alive by the transpiler and HTTP server
    } );
  }
  catch( error ) {
    console.error( 'An error occurred:', error );
    process.exit( 1 );
  }
} )();