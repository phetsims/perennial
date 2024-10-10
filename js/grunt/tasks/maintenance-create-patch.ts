// Copyright 2024, University of Colorado Boulder

/**
 * Adds a patch to the maintenance process
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import winston from 'winston';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import Maintenance from '../../common/Maintenance.js';
import getOption from './util/getOption';

winston.default.transports.console.level = 'error';

// TODO: Does this belong in grunt? See https://github.com/phetsims/chipper/issues/1461
( async () => {

  const repo = getOption( 'repo' );
  assertIsValidRepoName( repo );

  const message = getOption( 'message' );

  assert( repo, 'Requires specifying a repo that will need to be patched with --repo={{REPO}}' );
  assert( message, 'Requires specifying a message (included with commits) with --message={{MESSAGE}}' );

  await Maintenance.createPatch( repo, message );
} )();