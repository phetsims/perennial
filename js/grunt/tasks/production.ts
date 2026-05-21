// Copyright 2024-2026, University of Colorado Boulder

/**
 * Marks a simulation as published, and deploys a production version of the simulation
 * --repo : The name of the repository to deploy
 * --branch : The release branch name (e.g. "1.7") that should be used for deployment
 * --noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out
 * --redeploy: If specified with noninteractive, allow the production deploy to have the same version as the previous deploy
 * --skipBuild: Skips the build step during the deploy
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import { assertIsValidRepoName } from '../../common/assertIsValidRepoName.js';
import { markRunnableAsPublished } from '../../common/markRunnableAsPublished.js';
import { production } from '../../common/deployment/production.js';
import getOption from './util/getOption.js';
import winston from 'winston';

// TODO revert to normal logging levels, see https://github.com/phetsims/totality/issues/140
winston.default.transports.console.level = 'info';

( async () => {

  const repo = getOption( 'repo' );
  assert( getOption( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( getOption( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
  assertIsValidRepoName( repo );

  await markRunnableAsPublished( repo );

  await production( repo, getOption( 'branch' ), {
    noninteractive: !!getOption( 'noninteractive' ),
    redeploy: getOption( 'redeploy' ),
    message: getOption( 'message' ),
    skipBuild: !!getOption( 'skipBuild' )
  } );

  // When running tsx in combination with readline, the process does not exit properly, so we need to force it. See https://github.com/phetsims/perennial/issues/389
  process.exit( 0 );
} )();