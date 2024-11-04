// Copyright 2024, University of Colorado Boulder

/**
 * Runs the eslint process on the specified repos. For cached repos, this uses the node API. For
 * uncached repos, it spawn a new process. This keeps within the memory limit and keeps up speed.
 *
 * It is assumed that linting occurs from one level deep in any given repo. This has ramifications for how we write
 * eslint config files across the codebase.
 *
 * TODO: This file was updated from https://github.com/phetsims/chipper/issues/1484, we should decide what to support
 * TODO: should every active-repo have eslint.config.mjs? Or should we have an opt out list somewhere? https://github.com/phetsims/chipper/issues/1484
 * TODO: Review this file: https://github.com/phetsims/chipper/issues/1484
 * TODO: Review the strategy of using new ESLint for cached, and child process for uncached, see https://github.com/phetsims/chipper/issues/1484
 * TODO: Should we just use new ESLint (node API), but spawn `grunt lint` on subsets of repos, see https://github.com/phetsims/chipper/issues/1484
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import { spawn } from 'child_process';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import getDataFile from '../common/getDataFile.js';
import showCommandLineProgress from '../common/showCommandLineProgress';
import getOption from './tasks/util/getOption.js';
import { ESLint } from 'eslint';

const ESLINT_COMMAND = path.join( `${__dirname}/../../node_modules/.bin/eslint` );
type LintResult = { ok: boolean };

type Repo = string;

export type LintOptions = {
  repos: Repo[];
  cache: boolean;
  fix: boolean;
  chipAway: boolean;
  showProgressBar: boolean;
};
export type RequiredReposInLintOptions = Partial<LintOptions> & Pick<LintOptions, 'repos'>;

const DO_NOT_LINT = [ 'babel', 'phet-vite-demo', 'scenery-stack-test' ]; // TODO: enable linting for scenery-stack-test, see https://github.com/phetsims/scenery-stack-test/issues/1

const getCacheLocation = ( repo: Repo ) => path.resolve( `../chipper/dist/eslint/cache/${repo}.eslintcache` );
const OLD_CACHE = '../chipper/eslint/cache/';

function lintWithChildProcess( repo: Repo, options: LintOptions ): Promise<number> {

  // Always write to the cache, even if it was cleared previously.
  const cacheFile = getCacheLocation( repo );
  const args = [ '--cache', '--cache-location', cacheFile ];

  args.push( '--no-error-on-unmatched-pattern' );

  // add --flag unstable_config_lookup_from_file so that eslint will look for .eslintrc.js files relative to the file being linted
  // This will be the default behavior in eslint 10.0
  // TODO: Now that eslint.config.mjs resolution is based on the file being linted, can we bring back multiple repos being linted in one unit? See https://github.com/phetsims/chipper/issues/1484
  args.push( '--flag', 'unstable_config_lookup_from_file' );

  // Add the '--fix' option if fix is true
  options.fix && args.push( '--fix' );

  args.push( ...[
    // '--rulesdir', '../chipper/eslint/rules/',
    // '--resolve-plugins-relative-to', '../chipper',
    // '--ignore-path', '../chipper/eslint/.eslintignore',
    // '--ext', '.js,.jsx,.ts,.tsx,.mjs,.cjs,.html',
    // '--debug'
  ] );

  // Only lint from that single repo, from that repo as cwd; last is best for this one
  args.push( './' );

  return new Promise( resolve => {

    // Prepare environment for spawn process, defaulting to the existing env
    const env = Object.create( process.env );

    // Increase available memory for NodeJS heap, to future-proof for, https://github.com/phetsims/chipper/issues/1415
    env.NODE_OPTIONS = env.NODE_OPTIONS || '';

    if ( !env.NODE_OPTIONS.includes( '--max-old-space-size' ) ) {
      env.NODE_OPTIONS += ' --max-old-space-size=8192';
    }

    // It is nice to use our own spawn here instead of execute() so we can stream progress updates as it runs.
    const eslint = spawn( ESLINT_COMMAND, args, {
      cwd: `../${repo}`,

      // A shell is required for npx because the runnable is a shell script. see https://github.com/phetsims/perennial/issues/359
      shell: process.platform.startsWith( 'win' ),
      env: env // Use the prepared environment
    } );
    let hasPrinted = false;
    // Make sure that the repo is clearly printed for the log
    const preLoggingStep = () => {
      if ( !hasPrinted ) {
        console.log( `\n${repo}:` );
        hasPrinted = true;
      }
    };

    // It is possible the json is bigger than one chunk of data, so append to it.
    eslint.stdout.on( 'data', data => {
      preLoggingStep();
      console.log( data.toString() );
    } );
    eslint.stderr.on( 'data', data => {
      preLoggingStep();
      console.error( data.toString() );
    } );
    eslint.on( 'close', () => resolve( eslint.exitCode || 0 ) );
  } );
}

/**
 * Lints repositories using a worker pool approach.
 */
async function lintWithWorkers( repos: Repo[], options: LintOptions ): Promise<LintResult> {
  const reposQueue: Repo[] = [ ...repos.filter( repo => !DO_NOT_LINT.includes( repo ) ) ];
  const exitCodes: number[] = [];

  options.showProgressBar && showCommandLineProgress( 0, false );
  let doneCount = 0;

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

      const cacheLocation = getCacheLocation( repo );
      if ( fs.existsSync( cacheLocation ) ) {
        exitCodes.push( await lintWithNodeAPI( repo, options ) );
      }
      else {
        exitCodes.push( await lintWithChildProcess( repo, options ) );
      }

      doneCount++;
      options.showProgressBar && showCommandLineProgress( doneCount / repos.length, false );
    }
  };

  // TODO: https://github.com/phetsims/chipper/issues/1468 fine tune the number of workers, maybe with require('os').cpus().length?
  const numWorkers = 8;
  const workers = _.times( numWorkers, () => worker() );

  // Wait for all workers to complete
  await Promise.all( workers );
  options.showProgressBar && showCommandLineProgress( 1, true );

  const ok = _.every( exitCodes, code => code === 0 );
  return { ok: ok };
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
const lint = async ( providedOptions: RequiredReposInLintOptions ): Promise<LintResult> => {

  const options = _.assignIn( {

    // Cache results for a speed boost.
    cache: true,

    // Fix things that can be auto-fixed (written to disk)
    fix: false,

    // Prints responsible dev info for any lint errors for easier GitHub issue creation.
    chipAway: false, // TODO: not easy to support since flat config rewrite (since we don't get json output, just console logging), see https://github.com/phetsims/chipper/issues/1484

    // Show a progress bar while running, based on the current repo index in the provided list parameter
    showProgressBar: true
  }, providedOptions );

  const originalRepos = _.uniq( options.repos ); // Don't double lint repos

  assert( originalRepos.length > 0, 'no repos provided to lint' );

  // If options.cache is not set, clear the caches
  if ( !options.cache ) {
    clearCaches( originalRepos );
  }
  handleOldCacheLocation();

  // Don't show a progress bar for just a single repo
  options.showProgressBar = options.showProgressBar && originalRepos.length > 1;

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
  return { ok: false };
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
 * If no repos are provided, activeRepos will be used as the list of repos to lint (equivalent to --all)
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
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
    fix: !!getOption( 'fix' ),

    // Prints responsible dev info for any lint errors for easier GitHub issue creation.
    chipAway: !!getOption( 'chip-away' ),

    // Show a progress bar while running, based on the current repo index in the provided list parameter
    showProgressBar: !getOption( 'hide-progress-bar' )
  }, options );

  if ( lintOptions.repos.length === 0 || getOption( 'all' ) ) {

    // remove duplicate perennial copy
    lintOptions.repos = getDataFile( 'active-repos' ).filter( repo => repo !== 'perennial-alias' );
  }
  return lintOptions;
};

// Mark the version so that we don't try to lint old shas if on an older version of chipper.
// TODO: Should we change this? I'm unsure what all the possibilities are, https://github.com/phetsims/chipper/issues/1484
lint.chipperAPIVersion = 'npx';
export default lint;