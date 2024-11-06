// Copyright 2024, University of Colorado Boulder

/**
 * Run ESLint on the specified repos.
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
 * If you have a small enough batch (say, less than 50 repos), you can run this directly via:
 * cd perennial-alias
 * sage run js/eslint/lint-main.ts --repos=density
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import { ESLint } from 'eslint';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import process from 'process';
import { tscCleanRepo } from '../grunt/check.js';
import getOption from '../grunt/tasks/util/getOption.js';
import getLintOptions, { LintOptions, Repo, RequiredReposInLintOptions, DEFAULT_MAX_PROCESSES } from './getLintOptions.js';

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
    }
  };

  // We experimented with different numbers of workers, and 8 seems to be a reasonable number to get good performance
  const numWorkers = 8;
  const workers = _.times( numWorkers, () => worker() );

  // Wait for all workers to complete
  const results = await Promise.allSettled( workers );

  // Log any errors to prevent silent failures with exit code 1.
  results.forEach( result => result.status === 'rejected' && console.error( result.reason ) );

  // output true if all succeeded, false if any failed
  return exitCodes.every( code => code === 0 ) && results.every( result => result.status === 'fulfilled' );
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
    flags: [ 'unstable_config_lookup_from_file' ],
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

  // Output results, prefixed with the repo name
  let loggedRepo = false;

  if ( results.length > 0 ) {
    const formatter = await eslint.loadFormatter( 'stylish' );
    const resultText = await formatter.format( results );

    if ( resultText.trim().length > 0 ) {
      if ( !loggedRepo ) {
        console.log( `\n${repo}:` );
        loggedRepo = true;
      }

      console.log( resultText );
    }
  }

  // Determine exit code
  const errorCount = results.reduce( ( sum, result ) => sum + result.errorCount, 0 );
  return errorCount === 0 ? 0 : 1; // Return 0 if no errors, 1 if there are errors
}

const clearCaches = ( originalRepos: Repo[] ) => {
  originalRepos.forEach( async repo => {
    const cacheFile = getCacheLocation( repo );

    try {
      fs.unlinkSync( cacheFile );
    }
    catch( err ) {
      if ( err instanceof Error && 'code' in err && err.code === 'ENOENT' ) {
        // Do nothing if the file does not exist
      }
      else {
        throw err; // Re-throw the error if it's something else
      }
    }

    if ( fs.existsSync( path.resolve( `../${repo}/tsconfig.json` ) ) ) {
      await tscCleanRepo( repo );
    }
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
    fix: false,

    processes: DEFAULT_MAX_PROCESSES
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
  const success = await lint( options );

  process.exit( success ? 0 : 1 );
} )();