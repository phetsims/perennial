// Copyright 2024, University of Colorado Boulder

/**
 * Creates a new release branch for a given simulation
 * --repo : The repository to add the release branch to
 * --branch : The branch/one-off name, which should be anything without dashes or periods
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import createOneOff from '../createOneOff.js';
import getOption from './util/getOption.js';

( async () => {

  const repo = getOption( 'repo' );

  const branch = getOption( 'branch' );
  const message = getOption( 'message' );
  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( branch, 'Requires specifying a branch with --branch={{BRANCH}}' );
  assert( !branch.includes( '-' ) && !branch.includes( '.' ), 'Branch should not contain dashes or periods' );
  assertIsValidRepoName( repo );

  await createOneOff( repo, branch, message );
} )();