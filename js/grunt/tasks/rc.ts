// Copyright 2024, University of Colorado Boulder

/**
 * Deploys an rc version of the simulation
 * --repo : The name of the repository to deploy
 * --branch : The release branch name (e.g. "1.7") that should be used for deployment
 * --brands : A comma-separated list of brand names to deploy
 * --noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName';
import rc from '../rc';
import getOption from './util/getOption';

( async () => {
  assert( getOption( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( getOption( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
  assert( getOption( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

  const repo = getOption( 'repo' );
  assertIsValidRepoName( repo );

  await rc( repo, getOption( 'branch' ), getOption( 'brands' ).split( ',' ),
    !!getOption( 'noninteractive' ), getOption( 'message' ) );
} )();