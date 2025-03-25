// Copyright 2024, University of Colorado Boulder

/**
 * This entry point for lint divides the list of repos into batches and spawns lint-main processes to do the work.
 * See lint-main.ts for details.
 *
 * Sadly, the colorization from ESLint stylish is lost when spawning child processes.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import { spawn } from 'child_process';
import _ from 'lodash';
import path from 'path';
import { Repo } from '../browser-and-node/PerennialTypes.js';
import dirname from '../common/dirname.js';
import tsxCommand from '../common/tsxCommand.js';
import divideIntoBatches from './divideIntoBatches.js';
import { DEFAULT_MAX_PROCESSES, LintOptions } from './getLintCLIOptions.js';

// @ts-expect-error - until we have "type": "module" in our package.json
const __dirname = dirname( import.meta.url );

const lintMainPath = path.join( __dirname, 'lint-main.ts' );

// For debugging the options and making sure they pass through correctly
export const DEBUG_PHET_LINT = false;

export default async function lint( repos: Repo[], providedOptions?: LintOptions ): Promise<boolean> {
  repos = _.uniq( repos ); // Don't double lint repos
  assert( repos.length > 0, 'no repos provided to lint' );

  const options = _.assignIn( {

    // Cache results for a speed boost, but clean cache if the lint rules or configuration has changed
    clean: false,

    // Fix things that can be auto-fixed (written to disk)
    fix: false,

    processes: DEFAULT_MAX_PROCESSES
  }, providedOptions );


  const repoBatches = divideIntoBatches( repos, options.processes );

  if ( DEBUG_PHET_LINT ) {
    console.log( 'lint.js repos', repos );
    console.log( 'lint.js clean', options.clean );
    console.log( 'lint.js fix', options.fix );
    console.log( 'lint.js processes', options.processes );
    console.log( 'lint.js repoBatches', repoBatches );
  }

  // spawn node lint-main.js for each batch and wait for all to complete using child process
  const promises = repoBatches.map( batch => {
    return new Promise<void>( ( resolve, reject ) => {

      const child = spawn( tsxCommand, [
          lintMainPath,
          `--repos=${batch.join( ',' )}`,
          `--clean=${options.clean}`,
          `--fix=${options.fix}`
        ], {
          stdio: [ 'ignore', 'pipe', 'pipe' ],
          shell: process.platform.startsWith( 'win' )
        }
      );
      DEBUG_PHET_LINT && console.log( 'SPAWN ONCE on batch', batch );

      let stdout = '';
      let stderr = '';

      child.stdout.on( 'data', data => { stdout += data.toString(); } );
      child.stderr.on( 'data', data => { stderr += data.toString(); } );

      child.on( 'close', ( code: number ) => {

        // After the process closes, output its collected stdout and stderr, if any
        stdout && process.stdout.write( stdout );
        stderr && process.stderr.write( stderr );

        if ( code === 0 ) {
          resolve();
        }
        else {
          reject( new Error( `lint-main.js exited with code ${code}` ) );
        }
      } );
    } );
  } );

  // Await completion of all processes
  const results = await Promise.allSettled( promises );
  return results.every( result => result.status === 'fulfilled' );
}