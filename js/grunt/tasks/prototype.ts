// Copyright 2024, University of Colorado Boulder

/**
 * Deploys a production (prototype) version of the simulation
 * --repo : The name of the repository to deploy
 * --branch : The release branch name (e.g. "1.7") that should be used for deployment
 * --brands : A comma-separated list of brand names to deploy
 * --noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out
 * --redeploy: If specified with noninteractive, allow the production deploy to have the same version as the previous deploy
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import production from '../production.js';
import getOption from './util/getOption.js';

( async () => {

  const repo = getOption( 'repo' );
  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( getOption( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
  assert( getOption( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );
  assertIsValidRepoName( repo );

  await production( repo, getOption( 'branch' ), getOption( 'brands' ).split( ',' ), !!getOption( 'noninteractive' ),
    getOption( 'redeploy' ), getOption( 'message' ) );

  // When running tsx in combination with readline, the process does not exit properly, so we need to force it. See https://github.com/phetsims/perennial/issues/389
  process.exit( 0 );
} )();