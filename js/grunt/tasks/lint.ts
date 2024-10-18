// Copyright 2013-2024, University of Colorado Boulder

/**
 * lint js files. Options:
 * --disable-eslint-cache: cache will not be read from, and cache will be cleared for next run.
 * --fix: autofixable changes will be written to disk
 * --chip-away: output a list of responsible devs for each repo with lint problems
 * --repos: comma separated list of repos to lint in addition to the repo from running
 * see parseLintOptions() for full API.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
import * as grunt from 'grunt';
import lint from '../lint.js';
import parseLintOptions from './util/parseLintOptions.js';
import getOption from './util/getOption.js';
import getRepo from './util/getRepo.js';

const repo = getRepo();

export const lintTask = ( async () => {

  const extraRepos = getOption( 'repos' ) ? getOption( 'repos' ).split( ',' ) : [];

  const lintReturnValue = await lint( [ repo, ...extraRepos ], parseLintOptions() );

  if ( !lintReturnValue.ok ) {
    grunt.fail.fatal( 'Lint failed' );
  }
} )();