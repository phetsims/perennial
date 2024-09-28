// Copyright 2024, University of Colorado Boulder

/**
 * 'Deploys a one-off version of the simulation (using the current or specified branch)\n' +
 *   '--repo : The name of the repository to deploy\n' +
 *   '--branch : The name of the one-off branch (the name of the one-off)\n' +
 *   '--brands : A comma-separated list of brand names to deploy\n' +
 *   '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out\n' +
 *   '--message : An optional message that will be appended on version-change commits.',
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName';
import getBranch from '../../common/getBranch';
import dev from '../dev';
import getOption from './util/getOption';

( async () => {

  const repo = getOption( 'repo' );
  assertIsValidRepoName( repo );

  const brands = getOption( 'brands' );

  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( brands, 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

  let branch = getOption( 'branch' );
  if ( !branch ) {
    branch = await getBranch( repo );
    console.log( `--branch not provided, using ${branch} detected from ${repo}` );
  }
  assert( branch !== 'main', 'One-off deploys for main are unsupported.' );

  await dev( repo, brands.split( ',' ), !!getOption( 'noninteractive' ), branch, getOption( 'message' ) );
} )();
