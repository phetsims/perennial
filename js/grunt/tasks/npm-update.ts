// Copyright 2024, University of Colorado Boulder

/**
 * Runs npm update/prune for chipper, perennial-alias and the given repository
 * --repo : The repository to update
 * TODO: ASK DEVS: Delete this grunt task, SR MK think it doesn't belong in formal API, https://github.com/phetsims/chipper/issues/1461 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName';
import npmUpdate from '../../common/npmUpdate';
import getOption from './util/getOption';

( async () => {
  const repo = getOption( 'repo' );
  assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
  assertIsValidRepoName( repo );

  await npmUpdate( repo ).then( () => npmUpdate( 'chipper' ) ).then( () => npmUpdate( 'perennial-alias' ) );
} )();