// Copyright 2013-2024, University of Colorado Boulder

/**
 * lint js files. Options:
 * --clean or --disable-eslint-cache: cache will not be read from, and cache will be cleared for next run.
 * --fix: autofixable changes will be written to disk
 * --repos: comma separated list of repos to lint in addition to the repo from running
 * --all: lint all repos in the phet-info repo. This is a convenience for running lint on all repos.
 * see getLintCLIOptions() for more information.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
import getLintCLIOptions, { getLintEverythingRepos } from '../../eslint/getLintCLIOptions.js';
import lint from '../../eslint/lint.js';
import getOption, { isOptionKeyProvided } from './util/getOption.js';
import getRepo from './util/getRepo.js';

export const lintPromise = ( async () => {

  let repos = [ getRepo() ];
  if ( isOptionKeyProvided( 'repos' ) ) {
    repos.push( ...getOption( 'repos' ).split( ',' ) );
  }

  if ( isOptionKeyProvided( 'all' ) ) {
    repos = getLintEverythingRepos();
  }

  const lintSuccess = await lint( repos, getLintCLIOptions() );

  if ( !lintSuccess ) {
    console.log( 'Lint failed' );
    process.exit( 1 );
  }
} )();