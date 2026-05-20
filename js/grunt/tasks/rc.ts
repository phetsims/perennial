// Copyright 2024-2026, University of Colorado Boulder

/**
 * Deploys an rc version of the simulation
 * --repo : The name of the repository to deploy
 * --branch : The release branch name (e.g. "1.7") that should be used for deployment
 * --noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out
 * --skipBuild: Skips the build step during the deploy
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import { assertIsValidRepoName } from '../../common/assertIsValidRepoName.js';
import { rc } from '../../common/deployment/rc.js';
import getOption from './util/getOption.js';

( async () => {
  const repo = getOption( 'repo' );
  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( getOption( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
  assertIsValidRepoName( repo );

  await rc( repo, getOption( 'branch' ), {
    noninteractive: !!getOption( 'noninteractive' ),
    message: getOption( 'message' ),
    skipBuild: !!getOption( 'skipBuild' )
  } );

  // When running tsx in combination with readline, the process does not exit properly, so we need to force it. See https://github.com/phetsims/perennial/issues/389
  process.exit( 0 );
} )();