// Copyright 2022-2024, University of Colorado Boulder

/**
 * Runs the eslint process specified repos. There is a fair amount of complexity below, see lint() function for
 * supported options.
 *
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

// modules
const _ = require( 'lodash' );
const { ESLint } = require( 'eslint' ); // eslint-disable-line require-statement-match
const fs = require( 'fs' );
const chipAway = require( './chipAway' );
const disableWithComment = require( './disableWithComment' );
const showCommandLineProgress = require( '../common/showCommandLineProgress' );
const CacheLayer = require( '../common/CacheLayer' );
const crypto = require( 'crypto' );
const path = require( 'path' );
const { Worker } = require( 'worker_threads' ); // eslint-disable-line require-statement-match

// constants
const EXCLUDE_REPOS = [ 'binder', 'fenster', 'decaf', 'scenery-lab-demo' ];

// "Pattern" is really a path, we assume here that gruntfiles help keep the right directory structure and can just pop
// out of the repo running the command
const repoToPattern = repo => `../${repo}`;

async function consoleLogResults( results ) {

  // No need to have the same ESLint just to format
  const formatter = await new ESLint().loadFormatter( 'stylish' );
  const resultText = formatter.format( results );
  console.log( `\n${resultText}\n` );
}

/**
 * Create an ESLint client and lint a single repo
 * @param {string} repo
 * @param {Object} [options]
 * @returns {Promise<Object>} - results from linting files, see ESLint.lintFiles
 */
const lintOneRepo = async ( repo, options ) => {
  options = _.assignIn( {
    cache: true,
    fix: false,
    format: false,
    inProgressErrorLogging: false // print out the
  }, options );

  // Hash on tsconfig file so when tsconfig changes it invalidates the cache.  NOTE this is a known memory leak.  May
  // need to clear the cache directory in a few years?
  const tsconfigFile = fs.readFileSync( '../chipper/tsconfig/all/tsconfig.json', 'utf-8' );

  // Also cache on package.json so that when eslint plugins change, it will invalidate the caches. Note this will
  // have false positives because it is possible to change package.json without changing
  // the eslint plugins
  const packageJSON = fs.readFileSync( '../chipper/package.json', 'utf-8' );

  const hash = crypto.createHash( 'md5' ).update( tsconfigFile + packageJSON ).digest( 'hex' );

  const eslintConfig = {

    // optional auto-fix
    fix: options.fix,

    // Caching only checks changed files or when the list of rules is changed.  Changing the implementation of a
    // custom rule does not invalidate the cache.  Caches are declared in .eslintcache files in the directory where
    // the process was run from. If false, this will delete the `cacheLocation` file.
    cache: options.cache,

    // Where to store the target-specific cache file.  Use only first 4 digits of hash to improve readability
    // at the risk of having more key collisions
    cacheLocation: `../chipper/eslint/cache/${repo}-${hash.substring( 0, 8 )}.eslintcache`,

    ignorePath: '../chipper/eslint/.eslintignore',

    resolvePluginsRelativeTo: '../chipper/',

    // Our custom rules live here
    rulePaths: [ '../chipper/eslint/rules' ],

    extensions: [ '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.html' ],

    // If no lintable files are found, it is not an error
    errorOnUnmatchedPattern: false
  };

  // For PhET's custom cache, see CacheLayer
  const cacheLayerKey = `lintRepo#${repo}`;

  if ( options.cache && CacheLayer.isCacheSafe( cacheLayerKey ) ) {
    // console.log( 'lint cache hit: ' + cacheLayerKey );
    return [];
  }
  else {
    // console.log( 'lint cache fail: ' + cacheLayerKey );
  }

  const config = {};
  const configExtends = [];
  if ( options.format ) {
    configExtends.push( '../chipper/eslint/format_eslintrc.js' );
  }

  config.extends = configExtends;
  eslintConfig.baseConfig = config;

  const eslint = new ESLint( eslintConfig );

  const results = await eslint.lintFiles( repoToPattern( repo ) );

  const totalWarnings = _.sum( results.map( result => result.warningCount ) );
  const totalErrors = _.sum( results.map( result => result.errorCount ) );
  if ( options.cache && totalWarnings === 0 && totalErrors === 0 ) {
    CacheLayer.onSuccess( cacheLayerKey );
  }

  if ( options.inProgressErrorLogging && totalWarnings + totalErrors > 0 ) {

    // TODO: why did aqua have this? https://github.com/phetsims/chipper/issues/1415
    console.log( `\n\n${repo}:` );
    await consoleLogResults( results );
  }

  return results;
};

/**
 * Lint a batch of repos and only return the restults. This does no result handling.
 */
const lintReposFromWorker = async ( repos, options ) => {
  const allResults = [];
  for ( let i = 0; i < repos.length; i++ ) {
    const results = await lintOneRepo( repos[ i ], {
      cache: options.cache,
      format: options.format,
      fix: options.fix,
      inProgressErrorLogging: options.inProgressErrorLogging
    } );
    allResults.push( ...results );
  }
  return allResults;
};

/**
 * Lints the specified repositories.
 * @public
 *
 * @param {string[]} repos - list of repos to lint
 * @param {Object} [options]
 * @returns {Promise<{results:Object,ok:boolean}>} - results from linting files, see ESLint.lintFiles (all results, not just errors).
 */
const lint = async ( repos, options ) => {

  // Run all linting from chipper so the ESLint cache will be shared, see https://github.com/phetsims/chipper/issues/1286
  const cwd = process.cwd();
  process.chdir( '../chipper' );

  options = _.merge( {
    cache: true,
    format: false, // append an extra set of rules for formatting code. TODO: remove this option, these are inside the main rules now, https://github.com/phetsims/chipper/issues/1415
    fix: false, // whether fixes should be written to disk
    chipAway: false, // returns responsible dev info for easier chipping.
    disableWithComment: false, // replaces failing typescript lines with eslint disable and related comment
    showProgressBar: true
  }, options );

  // filter out all unlintable repos. An unlintable repo is one that has no `js` in it, so it will fail when trying to
  // lint it.  Also, if the user doesn't have some repos checked out, those should be skipped
  repos = repos.filter( repo => !EXCLUDE_REPOS.includes( repo ) &&
                                fs.existsSync( repoToPattern( repo ) ) );

  const inProgressErrorLogging = repos.length > 1;

  const allResults = [];

  // chunk time
  const repoChunks = _.chunk( repos, 10 );

  for ( const chunkOfRepos of repoChunks ) {
    options.showProgressBar && repoChunks.length > 1 && showCommandLineProgress( repoChunks.indexOf( chunkOfRepos ) / repoChunks.length, false );

    try {
      const myPromise = new Promise( ( resolve, reject ) => {
        const worker = new Worker( path.join( __dirname, '/lintWorker.js' ) );
        worker.on( 'message', resolve );
        worker.on( 'error', reject );
        worker.on( 'exit', code => {
          if ( code !== 0 ) {
            reject( new Error( `Lint Worker stopped with exit code ${code}` ) );
          }
        } );

        worker.postMessage( {
          repos: chunkOfRepos,
          options: {
            cache: options.cache,
            format: options.format,
            fix: options.fix,
            inProgressErrorLogging: inProgressErrorLogging
          }
        } );
      } );
      const results = await myPromise;
      allResults.push( ...results );
    }
    catch( e ) {
      console.error( e ); // make sure that the error ends up on stderr
      throw e;
    }
  }

  options.showProgressBar && repos.length > 1 && showCommandLineProgress( 1, true );

  // Modify the files with the fixed code.
  if ( options.fix ) {
    await ESLint.outputFixes( allResults );
  }

  // Parse the results.
  const totalWarnings = _.sum( allResults.map( result => result.warningCount ) );
  const totalErrors = _.sum( allResults.map( result => result.errorCount ) );

  // Output results on errors.
  if ( totalWarnings + totalErrors > 0 ) {

    // This exact string is used in AQUA/QuickServer to parse messaging for slack reporting
    const IMPORTANT_MESSAGE_DO_NOT_EDIT = 'All results (repeated from above)';
    inProgressErrorLogging && console.log( `\n\n${IMPORTANT_MESSAGE_DO_NOT_EDIT}\n` );

    await consoleLogResults( allResults );

    // The chip-away option provides a quick and easy method to assign devs to their respective repositories.
    // Check ./chipAway.js for more information.
    if ( options.chipAway ) {
      const message = chipAway( allResults );
      console.log( 'Results from chipAway: \n' + message );
    }

    if ( options.disableWithComment ) {
      disableWithComment( allResults );
    }
  }

  process.chdir( cwd );

  const ok = totalWarnings + totalErrors === 0;

  return {
    results: allResults,
    ok: ok
  };
};

// Mark the version so that the pre-commit hook will only try to use the promise-based API, this means
// it won't run lint precommit hook on SHAs before the promise-based API
lint.chipperAPIVersion = 'promisesPerRepo1';

// only used by the lintWorker.js, please don't use this.
// TODO: Is there a better way to expose this? https://github.com/phetsims/chipper/issues/1415
lint.lintReposFromWorker = lintReposFromWorker;

module.exports = lint;