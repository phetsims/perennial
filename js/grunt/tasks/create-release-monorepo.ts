// Copyright 2026, University of Colorado Boulder

/**
 * Creates a release branch for a simulation in the totality monorepo.
 * --repo : The sim repo
 * --branch : The branch name, which should be {{MAJOR}}.{{MINOR}}, e.g. 1.0
 * --brands : The supported brands for the release, comma separated
 * --message : An optional message appended to the commit message
 * --no-push : If set, do everything locally but skip pushing to origin; leaves the worktree for inspection
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import createReleaseMonorepo from '../createReleaseMonorepo.js';
import getOption from './util/getOption.js';

( async () => {
  const repo = getOption( 'repo' );
  const branch = getOption( 'branch' );
  const brands = getOption( 'brands' );
  const message = getOption( 'message' );
  const noPush = !!getOption( 'no-push' );

  assert( repo, 'Requires --repo={{REPO}}' );
  assert( branch, 'Requires --branch={{MAJOR}}.{{MINOR}}' );
  assert( brands, 'Requires --brands={{BRANDS}} (comma-separated)' );
  assertIsValidRepoName( repo );

  await createReleaseMonorepo( {
    repo: repo,
    branch: branch,
    brands: brands.split( ',' ),
    message: message,
    noPush: noPush
  } );

  process.exit( 0 );
} )();
