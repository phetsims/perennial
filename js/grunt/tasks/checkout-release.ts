// Copyright 2024-2026, University of Colorado Boulder

/**
 * Check out the latest deployed production release branch for a simulation and all of its declared dependencies
 * --repo : repository name where package.json should be read from
 * --skipNpmUpdate : If provided, will prevent the usual npm update
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import { assertIsValidDependencyName } from '../../common/assertIsValidDependencyName.js';
import { checkoutRelease } from '../../common/checkoutRelease.js';
import getOption from './util/getOption.js';

( async () => {
  const repo = getOption( 'repo' );

  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assertIsValidDependencyName( repo );

  await checkoutRelease( repo );
} )();