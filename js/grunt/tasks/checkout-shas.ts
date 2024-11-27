// Copyright 2024, University of Colorado Boulder

/**
 * Check out shas for a project, as specified in dependencies.json
 * --repo : repository name where package.json should be read from
 * --skipNpmUpdate : If provided, will prevent the usual npm update
 * --buildServer : If provided, it will read dependencies from the build-server temporary location (and will skip npm update)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import { readFileSync } from 'fs';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import checkoutDependencies from '../../common/checkoutDependencies.js';
import getOption from './util/getOption.js';

( async () => {
  assert( getOption( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

  const repo = getOption( 'repo' );
  assertIsValidRepoName( repo );

  const dependencies = JSON.parse( readFileSync( `../${repo}/dependencies.json`, 'utf8' ) );
  await checkoutDependencies( repo, dependencies, !getOption( 'skipNpmUpdate' ) );
} )();