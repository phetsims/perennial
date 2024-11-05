// Copyright 2024, University of Colorado Boulder

/**
 * Runs the eslint process on the specified repos. For cached repos, this uses the node API. For
 * uncached repos, it spawn a new process. This keeps within the memory limit and keeps up speed.
 *
 * It is assumed that linting occurs from one level deep in any given repo. This has ramifications for how we write
 * eslint config files across the codebase.
 *
 * This is called from lint.ts which batches into acceptable sizes (too many repos crashes with out of memory).
 * This architecture follows these design principles:
 * 1. Parallelism for speed
 * 2. Batching stdout/stderr instead of streaming, so that multiple processes don't intersperse/interfere
 * 3. Simplicity (using the same algorithm for any number of repos)
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import getOption from '../grunt/tasks/util/getOption.js';
import { ESLint } from 'eslint';
import getLintOptions, { LintOptions, Repo, RequiredReposInLintOptions } from './getLintOptions.js';

// TODO: enable linting for scenery-stack-test, see https://github.com/phetsims/scenery-stack-test/issues/1
// It is problematic for every repo to have a eslint.config.mjs, so it is preferable to opt-out some repos here, see https://github.com/phetsims/chipper/issues/1484
const DO_NOT_LINT = [ 'babel', 'phet-vite-demo', 'scenery-stack-test' ];

const getCacheLocation = ( repo: Repo ) => path.resolve( `../chipper/dist/eslint/cache/${repo}.eslintcache` );
const OLD_CACHE = '../chipper/eslint/cache/';

/**
 * Lints repositories using a worker pool approach.
 */
async function lintWithWorkers( repos: Repo[], options: LintOptions ): Promise<boolean> {
  const reposQueue: Repo[] = [ ...repos.filter( repo => !DO_NOT_LINT.includes( repo ) ) ];
  const exitCodes: number[] = [];

  /**
   * Worker function that continuously processes repositories from the queue.
   */
  const worker = async () => {

    while ( true ) {

      // Synchronize access to the queue
      // Since JavaScript is single-threaded, this is safe
      if ( reposQueue.length === 0 ) {
        break; // No more repositories to process
      }

      const repo = reposQueue.shift()!; // Get the next repository

      const result = await lintWithNodeAPI( repo, options );
      exitCodes.push( result );
      // process.stdout.write( result === 0 ? '.' : 'x' );
    }
  };

  // TODO: https://github.com/phetsims/chipper/issues/1468 fine tune the number of workers, maybe with require('os').cpus().length?
  const numWorkers = 8;
  const workers = _.times( numWorkers, () => worker() );

  // Wait for all workers to complete
  await Promise.all( workers );

  const success = _.every( exitCodes, code => code === 0 );
  return success;
}

/**
 * Runs ESLint on a single repository using the ESLint Node API.
 */
async function lintWithNodeAPI( repo: Repo, options: LintOptions ): Promise<number> {

  // Prepare options for ESLint instance
  const eslintOptions = {
    cwd: path.resolve( `../${repo}` ),
    cache: true,
    cacheLocation: path.resolve( getCacheLocation( repo ) ),
    fix: options.fix,
    errorOnUnmatchedPattern: false
  };

  // Create ESLint instance
  const eslint = new ESLint( eslintOptions );

  // Lint files in the repo
  const patterns = [ './' ]; // Lint all files starting from the repo root

  let results: ESLint.LintResult[];
  try {
    // console.log( 'linting files in repo', repo );
    results = await eslint.lintFiles( patterns );
  }
  catch( error ) {
    console.error( `Error linting files in repo ${repo}:`, error );
    return 1; // Non-zero exit code to indicate failure
  }

  // If fix is enabled, write the fixed files
  if ( options.fix ) {
    await ESLint.outputFixes( results );
  }

  // Output results
  let hasPrinted = false;
  const preLoggingStep = () => {
    if ( !hasPrinted ) {
      console.log( `\n${repo}:` );
      hasPrinted = true;
    }
  };

  if ( results.length > 0 ) {
    const formatter = await eslint.loadFormatter( 'stylish' );
    const resultText = await formatter.format( results );

    if ( resultText.trim().length > 0 ) {
      preLoggingStep();
      console.log( resultText );
    }
  }

  // Determine exit code
  const errorCount = results.reduce( ( sum, result ) => sum + result.errorCount, 0 );
  return errorCount === 0 ? 0 : 1; // Return 0 if no errors, 1 if there are errors
}

// TODO: Console log for all these repos? https://github.com/phetsims/chipper/issues/1484
const clearCaches = ( originalRepos: Repo[] ) => {
  originalRepos.forEach( repo => {
    const cacheFile = getCacheLocation( repo );

    try {
      fs.unlinkSync( cacheFile );
    }
    catch( err ) {
      if ( err instanceof Error && 'code' in err && err.code === 'ENOENT' ) {

        // Do nothing if the file does not exist
      }
      else {

        // Re-throw the error if it's something else
        throw err;
      }
    }
    // TODO: run tsc -b --clean here since we are breaking the cache? https://github.com/phetsims/chipper/issues/1484
  } );
};

/**
 * Lints the specified repositories.
 */
const lint = async ( providedOptions: RequiredReposInLintOptions ): Promise<boolean> => {

  const options = _.assignIn( {

    // Cache results for a speed boost.
    cache: true,

    // Fix things that can be auto-fixed (written to disk)
    fix: false
  }, providedOptions );

  const originalRepos = _.uniq( options.repos ); // Don't double lint repos

  assert( originalRepos.length > 0, 'no repos provided to lint' );

  // If options.cache is not set, clear the caches
  if ( !options.cache ) {
    clearCaches( originalRepos );
  }
  handleOldCacheLocation();

  // Top level try-catch just in case.
  try {
    return await lintWithWorkers( originalRepos, options );
  }
  catch( error ) {
    if ( error instanceof Error ) {
      console.error( 'Error running ESLint:', error.message );
      throw error;
    }
  }
  return false;
};

// Even though on main the new cache location is chipper/dist/eslint/cache, linting on old shas still produces a
// cache in chipper/eslint/cache. Delete it eagerly and always when it is there.
function handleOldCacheLocation(): void {
  try {
    fs.existsSync( OLD_CACHE ) && fs.rmSync( OLD_CACHE, { recursive: true } );
  }
  catch( e ) {
    console.error( `error removing old cache location: ${e}` ); // Please report these problems to https://github.com/phetsims/chipper/issues/1508
  }
}

// eslint-disable-next-line no-void
void ( async () => {
  const repos = getOption( 'repos' );
  const options = repos ? getLintOptions( { repos: repos.split( ',' ) } ) : getLintOptions();
  await lint( options );
} )();