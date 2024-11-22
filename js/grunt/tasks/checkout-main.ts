// Copyright 2024, University of Colorado Boulder

/**
 * Check out main branch for all dependencies, as specified in dependencies.json
 * --repo : repository name where package.json should be read from
 * --skipNpmUpdate : If provided, will prevent the usual npm update
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import checkoutMain from '../../common/checkoutMain.js';
import getOption from './util/getOption.js';

( async () => {
  const repo = getOption( 'repo' );

  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );

  assertIsValidRepoName( repo );

  await checkoutMain( repo, !getOption( 'skipNpmUpdate' ) );
} )();