// Copyright 2024, University of Colorado Boulder

/**
 * This entry point for lint divides the list of repos into batches and spawns lint-main processes to do the work.
 * See lint-main.ts for details.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import { spawn } from 'child_process';
import _ from 'lodash';
import path from 'path';
import tsxCommand from '../common/tsxCommand.js';
import divideIntoBatches from './divideIntoBatches.js';
import { RequiredReposInLintOptions } from './getLintOptions.js';

const lintMainPath = path.join( __dirname, 'lint-main.js' );

export default async function( providedOptions: RequiredReposInLintOptions ): Promise<boolean> {

  const options = _.assignIn( {

    // Cache results for a speed boost.
    cache: true,

    // Fix things that can be auto-fixed (written to disk)
    fix: false
  }, providedOptions );

  const originalRepos = _.uniq( options.repos ); // Don't double lint repos

  assert( originalRepos.length > 0, 'no repos provided to lint' );

  const repoBatches = divideIntoBatches( originalRepos );

  // spawn node lint-main.js for each batch and wait for all to complete using child process
  const promises = repoBatches.map( batch => {
    return new Promise<void>( ( resolve, reject ) => {

      // TODO: https://github.com/phetsims/chipper/issues/1484 this strategy loses the colorization of the stylish eslint output. Can it be restored?
      const child = spawn( tsxCommand, [
          lintMainPath,
          `--repos=${batch.join( ',' )}`,
          `--clean=${!options.cache}`,
          `--fix=${options.fix}`
        ], {
          stdio: [ 'ignore', 'pipe', 'pipe' ],
          shell: process.platform.startsWith( 'win' )
        }
      );

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