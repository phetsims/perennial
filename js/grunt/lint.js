// Copyright 2017-2022, University of Colorado Boulder

/**
 * Runs the lint rules on the specified files.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */


// modules
const _ = require( 'lodash' ); // eslint-disable-line require-statement-match
const { ESLint } = require( 'eslint' ); // eslint-disable-line require-statement-match
const fs = require( 'fs' );
const grunt = require( 'grunt' );
const crypto = require( 'crypto' );
const chipAway = require( './chipAway' );
// constants
const EXCLUDE_PATTERNS = [ // patterns that have no code that should be linted

  '../babel',
  '../decaf',
  '../phet-android-app',
  '../phet-info',
  '../phet-io-client-guides',
  '../phet-io-website',
  '../phet-io-wrapper-arithmetic',
  '../phet-io-wrapper-hookes-law-energy',
  '../phet-ios-app',
  '../qa',
  '../smithers',
  '../tasks'
];

const defaultLintOptions = {
  cache: true,
  format: false, // append an extra set of rules for formatting code.
  fix: false, // whether fixes should be written to disk
  warn: true, // whether errors should reported with grunt.warn
  chipAway: false, // returns responsible dev info for easier chipping.
  silent: false // don't log anything, just return the results.
};

/**
 * Use the lint results to output the desired content.
 * @param results - see ESLint.lintFiles
 * @param options - see defaultLintOptions
 * @returns {Promise<void>}
 */
const processResults = async ( results, options ) => {

  // Not all of these options are used in this function, but it seemed easier and more maintainable to just have one
  // place to state defaults.
  options = _.extend( defaultLintOptions, options );

  // Parse the results.
  const totalWarnings = _.sum( results.map( result => result.warningCount ) );
  const totalErrors = _.sum( results.map( result => result.errorCount ) );

  // Output results on errors.
  if ( totalWarnings + totalErrors > 0 ) {
    const formatter = await new ESLint().loadFormatter( 'stylish' );
    const resultText = formatter.format( results );
    !options.silent && console.log( resultText );

    // The chip-away option provides a quick and easy method to assign devs to their respective repositories.
    // Check ./chipAway.js for more information.
    if ( options.chipAway ) {
      const message = chipAway( results );
      !options.silent && console.log( 'Results from chipAway: \n' + message );
    }

    options.warn && grunt.fail.warn( `${totalErrors} errors and ${totalWarnings} warnings` );
  }
};

/**
 * Lints the specified repositories.
 * @public
 *
 * @returns {Promise} - results from linting files, see ESLint.lintFiles
 */
const lint = async ( patterns, options ) => {

  options = _.assignIn( defaultLintOptions, options );

  // filter out all unlintable pattern. An unlintable repo is one that has no `js` in it, so it will fail when trying to
  // lint it.  Also, if the user doesn't have some repos checked out, those should be skipped
  patterns = patterns.filter( pattern => !EXCLUDE_PATTERNS.includes( pattern ) &&
                                         fs.existsSync( pattern ) );

  const hash = crypto.createHash( 'md5' )
    .update( patterns.join( ',' ) )
    .digest( 'hex' );

  const eslintConfig = {

    // optional auto-fix
    fix: options.fix,

    // Caching only checks changed files or when the list of rules is changed.  Changing the implementation of a
    // custom rule does not invalidate the cache.  Caches are declared in .eslintcache files in the directory where
    // grunt was run from.
    cache: options.cache,

    // Where to store the target-specific cache file
    cacheLocation: `../chipper/eslint/cache/${hash}.eslintcache`,

    ignorePath: '../chipper/eslint/.eslintignore',

    resolvePluginsRelativeTo: '../chipper/',

    // Our custom rules live here
    rulePaths: [ '../chipper/eslint/rules' ],

    extensions: [ '.js', '.jsx', '.ts', '.tsx' ]
  };

  const config = {};
  const configExtends = [];
  if ( options.format ) {
    configExtends.push( '../chipper/eslint/format_eslintrc.js' );
  }

  config.extends = configExtends;
  eslintConfig.baseConfig = config;

  const eslint = new ESLint( eslintConfig );

  grunt.verbose.writeln( `linting: ${patterns.join( ', ' )}` );

  // 2. Lint files. This doesn't modify target files.
  const results = await eslint.lintFiles( patterns );

  // 3. Modify the files with the fixed code.
  if ( options.fix ) {
    await ESLint.outputFixes( results );
  }

  await processResults( results, options );

  return results;
};

// @public
lint.processResults = processResults;

// Mark the version so that the pre-commit hook will only try to use the promise-based API, this means
// it won't run lint precommit hook on SHAs before the promise-based API
lint.chipperAPIVersion = 'promises1';

module.exports = lint;