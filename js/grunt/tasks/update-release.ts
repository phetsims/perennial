// Copyright 2026, University of Colorado Boulder

/**
 * Update the worktree for a release branch
 * --repo: simulation name
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */
import assert from 'assert';
import { assertIsValidDependencyName } from '../../common/assertIsValidDependencyName.js';
import getOption from './util/getOption.js';
import { Checkout } from '../../common/Checkout.js';

( async () => {
  const repo = getOption( 'repo' );
  const branch = getOption( 'branch' );

  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( repo, 'Requires specifying a branch with --branch={{BRANCH}}' );
  assertIsValidDependencyName( repo );

  await ( await Checkout.getReleaseBranchCheckout( repo, branch ) ).update();
} )();
