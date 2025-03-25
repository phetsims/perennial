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
 * sage run js/eslint/lint-main.ts --repos=density --clean=false --fix=false
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
import { Repo } from '../browser-and-node/PerennialTypes.js';
import callbackOnWorkers from '../common/callbackOnWorkers.js';
import getActiveSceneryStackRepos from '../common/getActiveSceneryStackRepos.js';
import { tscCleanRepo } from '../grunt/typeCheck.js';
import { DEBUG_PHET_LINT } from './lint.js';

// It is problematic for every repo to have a eslint.config.mjs, so it is preferable to opt-out some repos here, see https://github.com/phetsims/chipper/issues/1484
const DO_NOT_LINT = [
  'babel',

  // these are old?
  'phet-vite-demo',

  // scenerystack repos - might need npm installs (all of them) to work, TODO https://github.com/phetsims/aqua/issues/226
  ...getActiveSceneryStackRepos()
];

const getCacheLocation = ( repo: Repo ) => path.resolve( `../chipper/dist/eslint/cache/${repo}.eslintcache` );
const OLD_CACHE = '../chipper/eslint/cache/';

/**
 * Lints repositories using a worker pool approach.
 */
async function lintWithWorkers( repos: Repo[], fix: boolean ): Promise<boolean> {
  const reposQueue: Repo[] = [ ...repos.filter( repo => !DO_NOT_LINT.includes( repo ) ) ];
  const exitCodes: number[] = [];

  const results = await callbackOnWorkers( reposQueue, async repo => {
    const lintResult = await lintWithNodeAPI( repo, fix );
    exitCodes.push( lintResult );
  } );

  // Log any errors to prevent silent failures with exit code 1.
  results.forEach( result => result.status === 'rejected' && console.error( result.reason ) );

  // output true if all succeeded, false if any failed
  return exitCodes.every( code => code === 0 ) && results.every( result => result.status === 'fulfilled' );
}

/**
 * Runs ESLint on a single repository using the ESLint Node API.
 */
async function lintWithNodeAPI( repo: Repo, fix: boolean ): Promise<number> {

  // Prepare options for ESLint instance
  const eslintOptions = {
    cwd: path.resolve( `../${repo}` ),

    // The --clean wipes the directory at the beginning, so we always want to cache the results of a run.
    cache: true,
    cacheLocation: path.resolve( getCacheLocation( repo ) ),
    fix: fix,
    flags: [ 'unstable_config_lookup_from_file' ],
    errorOnUnmatchedPattern: false
  };

  if ( DEBUG_PHET_LINT ) {
    console.error( 'lint-main: repo', repo );
    console.error( 'lint-main: fix: ', eslintOptions.fix );
  }

  // Create ESLint instance
  const eslint = new ESLint( eslintOptions );

  // Lint files in the repo
  const patterns = [ './' ]; // Lint all files starting from the repo root

  let results: ESLint.LintResult[];
  try {
    results = await eslint.lintFiles( patterns );
  }
  catch( error ) {
    console.error( `Error linting files in repo ${repo}:`, error );
    return 1; // Non-zero exit code to indicate failure
  }

  // If fix is enabled, write the fixed files
  if ( fix ) {
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

const cleanCaches = ( originalRepos: Repo[] ) => {
  DEBUG_PHET_LINT && console.error( 'lint-main clearing: ', originalRepos );
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
const lintMain = async ( repos: Repo[], clean: boolean, fix: boolean ): Promise<boolean> => {

  assert( repos.length > 0, 'no repos provided to lint' );

  // Clean in advance if requested. During linting the cache will be repopulated.
  clean && cleanCaches( repos );
  handleOldCacheLocation();

  // Top level try-catch just in case.
  try {
    return await lintWithWorkers( repos, fix );
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

/**
 * Use a very strict syntax here to simplify interoperability with the call site. All options are required.
 */
// eslint-disable-next-line no-void
void ( async () => {

  // search argv for --repos=a,b,c
  const reposArg = process.argv.find( arg => arg.startsWith( '--repos=' ) );
  const cleanArg = process.argv.find( arg => arg.startsWith( '--clean=' ) );
  const fixArg = process.argv.find( arg => arg.startsWith( '--fix=' ) );

  assert( reposArg, 'missing --repos argument' );
  assert( cleanArg, 'missing --clean argument' );
  assert( fixArg, 'missing --fix argument' );

  const repos: Repo[] = reposArg ? reposArg.split( '=' )[ 1 ].split( ',' ) : [];
  const clean = cleanArg ? cleanArg.split( '=' )[ 1 ] === 'true' : false;
  const fix = fixArg ? fixArg.split( '=' )[ 1 ] === 'true' : false;

  if ( DEBUG_PHET_LINT ) {
    console.error( 'lint-main.ts repos', repos );
    console.error( 'lint-main.ts clean', clean );
    console.error( 'lint-main.ts fix', fix );
  }

  const success = await lintMain( _.uniq( repos ), clean, fix );
  process.exit( success ? 0 : 1 );
} )();