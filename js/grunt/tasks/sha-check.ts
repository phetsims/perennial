// Copyright 2024, University of Colorado Boulder

/**
 * Checks which simulations\' latest release version includes the given common-code SHA in its git tree.
 * --repo : repository to check for the SHA
 * --sha : git SHA
 *
 * TODO: ASK DEVS: Delete this grunt task, SR MK think it doesn't belong in formal API, https://github.com/phetsims/chipper/issues/1461
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import shaCheck from '../shaCheck.js';
import getOption from './util/getOption.ts';

( async () => {
  const repo = getOption( 'repo' );
  assertIsValidRepoName( repo );

  await shaCheck( repo, getOption( 'sha' ) );
} )();