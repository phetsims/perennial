// Copyright 2024, University of Colorado Boulder

/**
 * Deploys a dev version of the simulation
 * --repo : The name of the repository to deploy
 * --brands : A comma-separated list of brand names to deploy
 * --noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import dev from '../dev.js';
import getOption from './util/getOption.js';

( async () => {
  const repo = getOption( 'repo' );
  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( getOption( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

  assertIsValidRepoName( repo );

  await dev( repo, getOption( 'brands' ).split( ',' ), !!getOption( 'noninteractive' ), 'main', getOption( 'message' ) );

  // When running tsx in combination with readline, the process does not exit properly, so we need to force it. See https://github.com/phetsims/perennial/issues/389
  process.exit( 0 );
} )();