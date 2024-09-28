// Copyright 2024, University of Colorado Boulder

/**
 * Runs cherry-pick on a list of SHAs until one works. Reports success or failure
 * --repo : The repository to cherry-pick on
 * --shas : Comma-separated list of SHAs to try
 * @author Michael Kauzmann (PhET Interactive Simulations)
 *
 */
import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import cherryPick from '../cherryPick';
import getOption from './util/getOption.ts';

( async () => {

  const repo = getOption( 'repo' );

  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( getOption( 'shas' ), 'Requires specifying a comma-separated list of SHAs with --shas={{SHAS}}' );

  assertIsValidRepoName( repo );

  const shas = getOption( 'shas' ).split( ',' );

  await cherryPick( repo, shas );
} )();