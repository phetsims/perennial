// Copyright 2024, University of Colorado Boulder

/**
 * This entry point for lint divides the list of repos into batches and spawns lint-main processes to do the work.
 * See lint-main.ts for details.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import _ from 'lodash';
import tsxCommand from '../common/tsxCommand.js';
import getOption from '../grunt/tasks/util/getOption.js';
import getDataFile from '../common/getDataFile.js';
import { spawn } from 'child_process';
import path from 'path';
import divideIntoBatches from './divideIntoBatches.js';

export type Repo = string;

export type LintOptions = {
  repos: Repo[];
  cache: boolean;
  fix: boolean;
};
export type RequiredReposInLintOptions = Partial<LintOptions> & Pick<LintOptions, 'repos'>;

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
  console.log( `Linting ${originalRepos.length} repos in ${repoBatches.length} batches` );

  // spawn node lint-main.js for each batch and wait for all to complete using child process
  const promises = repoBatches.map( batch => {
    return new Promise<void>( ( resolve, reject ) => {
      const lintMainPath = path.join( __dirname, 'lint-main.js' );

      const child = spawn( tsxCommand, [
          lintMainPath,
          `--repos=${batch.join( ',' )}`,
          `--clean=${!options.cache}`,
          `--fix=${options.fix}`
        ],
        {
          stdio: [ 'ignore', 'pipe', 'pipe' ],
          shell: process.platform.startsWith( 'win' )
        }
      );

      let stdout = '';
      let stderr = '';

      child.stdout.on( 'data', data => { stdout += data.toString(); } );
      child.stderr.on( 'data', data => { stderr += data.toString(); } );

      child.on( 'close', ( code: number ) => {
        // After the process closes, output its collected stdout and stderr
        if ( stdout ) {
          console.log( `Output from batch ${batch.join( ', ' )}:\n${stdout}` );
        }
        if ( stderr ) {
          console.error( `Errors from batch ${batch.join( ', ' )}:\n${stderr}` );
        }
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
  try {
    await Promise.all( promises );
    return true;
  }
  catch( error ) {
    return false;
  }
}

/**
 * If no repos are provided, activeRepos will be used as the list of repos to lint (equivalent to --all)
 */
export const getLintOptions = ( options?: Partial<LintOptions> ): LintOptions => {
  // TODO: Optionize would be nice, https://github.com/phetsims/perennial/issues/369

  // Two apis for turning this off.
  const cache = !( getOption( 'clean' ) || getOption( 'disable-eslint-cache' ) );

  const lintOptions = _.assignIn( {
    repos: [] as string[], // the repos to lint

    // Cache results for a speed boost.
    // Use --clean or --disable-eslint-cache to disable the cache; useful for developing rules.
    cache: cache,

    // Fix things that can be auto-fixed (written to disk)
    fix: !!getOption( 'fix' )
  }, options );

  if ( lintOptions.repos.length === 0 || getOption( 'all' ) ) {

    // remove duplicate perennial copy
    lintOptions.repos = getDataFile( 'active-repos' ).filter( repo => repo !== 'perennial-alias' );
  }
  return lintOptions;
};