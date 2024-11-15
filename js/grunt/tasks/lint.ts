// Copyright 2013-2024, University of Colorado Boulder

/**
 * lint js files. Options:
 * --clean or --disable-eslint-cache: cache will not be read from, and cache will be cleared for next run.
 * --fix: autofixable changes will be written to disk
 * --repos: comma separated list of repos to lint in addition to the repo from running
 * see getLintCLIOptions() for more information.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
import grunt from 'grunt';
import lint from '../../eslint/lint.js';
import getRepo from './util/getRepo.js';
import getLintCLIOptions, { getLintEverythingRepos } from '../../eslint/getLintCLIOptions.js';
import getOption, { isOptionKeyProvided } from './util/getOption.js';

export const lintTask = ( async () => {

  let repos = [ getRepo() ];
  if ( isOptionKeyProvided( 'repos' ) ) {
    repos.push( ...getOption( 'repos' ).split( ',' ) );
  }

  if ( isOptionKeyProvided( 'all' ) ) {
    repos = getLintEverythingRepos();
  }

  const lintSuccess = await lint( repos, getLintCLIOptions() );

  if ( !lintSuccess ) {
    grunt.fail.fatal( 'Lint failed' );
  }
} )();