// Copyright 2024, University of Colorado Boulder

/**
 * Deploys a one-off version of the simulation (using the current or specified branch)
 * --repo : The name of the repository to deploy
 * --branch : The name of the one-off branch (the name of the one-off)
 * --brands : A comma-separated list of brand names to deploy
 * --noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import checkoutMain from '../../common/checkoutMain.js';
import checkoutTarget from '../../common/checkoutTarget.js';
import getBranch from '../../common/getBranch.js';
import dev from '../dev.js';
import getOption from './util/getOption.js';

( async () => {

  const repo = getOption( 'repo' );
  const brands = getOption( 'brands' );

  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( brands, 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );
  assertIsValidRepoName( repo );

  let branch = getOption( 'branch' );
  if ( !branch ) {
    branch = await getBranch( repo );
    console.log( `--branch not provided, using ${branch} detected from ${repo}` );
  }
  assert( branch !== 'main', 'One-off deploys for main are unsupported.' );

  await checkoutTarget( repo, branch );
  await dev( repo, brands.split( ',' ), !!getOption( 'noninteractive' ), branch, getOption( 'message' ) );
  await checkoutMain( repo );

  // When running tsx in combination with readline, the process does not exit properly, so we need to force it. See https://github.com/phetsims/perennial/issues/389
  process.exit( 0 );
} )();