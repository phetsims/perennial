// Copyright 2024, University of Colorado Boulder

/**
 * Runs npm update/prune for chipper, perennial-alias and the given repository
 * --repo : The repository to update
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName';
import npmUpdate from '../../common/npmUpdate';
import getOption from './util/getOption';

( async () => {

  // TODO: use getRepo?
  const repo = getOption( 'repo' );
  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );

  assertIsValidRepoName( repo );

  await npmUpdate( repo ).then( () => npmUpdate( 'chipper' ) ).then( () => npmUpdate( 'perennial-alias' ) );
} )();