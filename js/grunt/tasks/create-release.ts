// Copyright 2024, University of Colorado Boulder

/**
 * Creates a new release branch for a given simulation
 * --repo : The repository to add the release branch to
 * --branch : The branch name, which should be {{MAJOR}}.{{MINOR}}, e.g. 1.0
 * --brands : The supported brands for the release, comma separated.
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import createRelease from '../createRelease.js';
import getOption from './util/getOption.js';

( async () => {

  const repo = getOption( 'repo' );

  const branch = getOption( 'branch' );
  const message = getOption( 'message' );
  const brands = getOption( 'brands' );

  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( brands, 'Requires specifying brands with --brands={{BRANDS}} (comma separated)' );
  assert( branch, 'Requires specifying a branch with --branch={{BRANCH}}' );
  assert( branch.split( '.' ).length === 2, 'Branch should be {{MAJOR}}.{{MINOR}}' );

  assertIsValidRepoName( repo );
  await createRelease( repo, branch, brands.split( ',' ), message );
} )();