// Copyright 2015, University of Colorado Boulder

/**
 * Runs the lint rules on the specified files.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
/* eslint-env node */
'use strict';

// modules
const eslint = require( 'eslint' );
const grunt = require( 'grunt' );
const md5 = require( 'md5' );
const path = require( 'path' );

/**
 * Lints the specified repositories.
 * @public
 *
 * @param {Array.<string>} repos
 * @param {boolean} cache
 * @returns {Object} - ESLint report object.
 */
module.exports = function( repos, cache ) {
  const cli = new eslint.CLIEngine( {

    cwd: path.dirname( process.cwd() ),

    // Rules are specified in the .eslintrc file
    configFile: 'chipper/eslint/.eslintrc',

    // Caching only checks changed files or when the list of rules is changed.  Changing the implementation of a
    // custom rule does not invalidate the cache.  Caches are declared in .eslintcache files in the directory where
    // grunt was run from.
    cache: cache,

    // Our custom rules live here
    rulePaths: [ 'chipper/eslint/rules' ],

    // Where to store the target-specific cache file
    cacheFile: `chipper/eslint/cache/${md5( repos.join( ',' ) )}.eslintcache`,

    // Files to skip for linting
    ignorePattern: [
      '**/.git',
      '**/build',
      '**/node_modules',
      '**/snapshots',
      'sherpa/**',
      '**/js/parser/svgPath.js',
      '**/templates/chipper-initialization.js',
      '**/templates/chipper-strings.js',
      '**/templates/sim-config.js',
      'phet-io-website/root/assets/js/ua-parser-0.7.12.min.js',
      'phet-io-website/root/assets/js/jquery-1.12.3.min.js',
      'phet-io-website/root/assets/highlight.js-9.1.0/highlight.pack.js',
      'phet-io-website/root/assets/highlight.js-9.1.0/highlight.js',
      'phet-io-website/root/assets/bootstrap-3.3.6-dist/js/npm.js',
      'phet-io-website/root/assets/bootstrap-3.3.6-dist/js/bootstrap.min.js',
      'phet-io-website/root/assets/bootstrap-3.3.6-dist/js/bootstrap.js',
      'phet-io-website/root/assets/js/phet-io-ga.js',
      'installer-builder/temp/**'
    ]
  } );

  grunt.verbose.writeln( 'linting: ' + repos.join( ', ' ) );

  // run the eslint step
  const report = cli.executeOnFiles( repos );

  // pretty print results to console if any
  ( report.warningCount || report.errorCount ) && grunt.log.write( cli.getFormatter()( report.results ) );

  report.warningCount && grunt.fail.warn( report.warningCount + ' Lint Warnings' );
  report.errorCount && grunt.fail.fatal( report.errorCount + ' Lint Errors' );

  return report;
};
