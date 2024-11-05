// Copyright 2013-2024, University of Colorado Boulder

/**
 * lint js files. Options:
 * --clean or --disable-eslint-cache: cache will not be read from, and cache will be cleared for next run.
 * --fix: autofixable changes will be written to disk
 * --repos: comma separated list of repos to lint in addition to the repo from running
 * see getLintOptions() for full API.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
import * as grunt from 'grunt';
import lint from '../../eslint/lint.js';
import getRepo, { getRepos } from './util/getRepo.js';
import getLintOptions from '../../eslint/getLintOptions.js';

const repo = getRepo();

export const lintTask = ( async () => {

  const extraRepos = getRepos();
  const lintSuccess = await lint( getLintOptions( { repos: [ repo, ...extraRepos ] } ) );

  if ( !lintSuccess ) {
    grunt.fail.fatal( 'Lint failed' );
  }
} )();