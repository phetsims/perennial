// Copyright 2024-2026, University of Colorado Boulder

/**
 * Deploys a one-off version of the simulation (using the current or specified branch)
 * --repo : The name of the repository to deploy
 * --name : The name of the one-off
 * --noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import { assertIsValidDependencyName } from '../../common/assertIsValidDependencyName.js';
import { dev } from '../../common/deployment/dev.js';
import getOption from './util/getOption.js';
import { Checkout } from '../../common/Checkout.js';
import { Sim } from '../../browser-and-node/PerennialTypes.js';
import { hasRemoteBranch } from '../../common/git/hasRemoteBranch.js';

( async () => {

  const sim: Sim = getOption( 'sim' );
  const oneOffName = getOption( 'name' );

  assert( sim, 'Requires specifying a simulation with --sim={{SIM}}' );
  assert( sim, 'Requires specifying a one-off name with --name={{NAME}}' );
  assertIsValidDependencyName( sim );

  const branch = Checkout.getOneOffBranchName( sim, oneOffName );

  // TODO: support one-offs without a worktree potentially? https://github.com/phetsims/totality/issues/140

  if ( !( await hasRemoteBranch( branch ) ) ) {
    await Checkout.createOneOffCheckout( sim, oneOffName );
  }

  await dev( sim, {
    oneOffBranch: branch,
    noninteractive: !!getOption( 'noninteractive' ),
    message: getOption( 'message' )
  } );

  // When running tsx in combination with readline, the process does not exit properly, so we need to force it. See https://github.com/phetsims/perennial/issues/389
  process.exit( 0 );
} )();