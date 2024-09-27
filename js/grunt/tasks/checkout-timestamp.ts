// Copyright 2024, University of Colorado Boulder

/**
 *   'Check out a specific timestamp for a simulation and all of its declared dependencies\n' +
 *   '--repo : repository name where package.json should be read from\n' +
 *   '--timestamp : the timestamp to check things out for, e.g. --timestamp="Jan 08 2018"\n' +
 *   '--skipNpmUpdate : If provided, will prevent the usual npm update',
 *
 *   @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName';
import checkoutTimestamp from '../../common/checkoutTimestamp';
import getOption from './util/getOption';

( async () => {
  const repo = getOption( 'repo' );

  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assert( getOption( 'timestamp' ), 'Requires specifying a timestamp with --timestamp={{BRANCH}}' );

  assertIsValidRepoName( repo );

  await checkoutTimestamp( repo, getOption( 'timestamp' ), !getOption( 'skipNpmUpdate' ) );
} )();