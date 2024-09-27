// Copyright 2024, University of Colorado Boulder

/**
 *  'Check out a specific branch/SHA for a simulation and all of its declared dependencies\n' +
 *   '--repo : repository name where package.json should be read from\n' +
 *   '--target : the branch/SHA to check out\n' +
 *   '--branch : alias for --target\n' +
 *   '--skipNpmUpdate : If provided, will prevent the usual npm update',
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName';
import checkoutTarget from '../../common/checkoutTarget';
import getOption from './util/getOption';

( async () => {
  const repo = getOption( 'repo' );

  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( !( getOption( 'target' ) && getOption( 'branch' ) ), '--target and --branch are the same option, only use one.' );
  const target = getOption( 'target' ) || getOption( 'branch' );
  assert( target, 'Requires specifying a branch/SHA with --target={{BRANCH}}' );

  assertIsValidRepoName( repo );


  await checkoutTarget( repo, target, !getOption( 'skipNpmUpdate' ) );
} )();