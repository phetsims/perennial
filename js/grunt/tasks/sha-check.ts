// Copyright 2024, University of Colorado Boulder

/**
 * Checks which simulations\' latest release version includes the given common-code SHA in its git tree.
 * --repo : repository to check for the SHA
 * --sha : git SHA
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import shaCheck from '../shaCheck';
import getOption from './util/getOption.ts';

( async () => {
  const repo = getOption( 'repo' );
  assertIsValidRepoName( repo );

  await shaCheck( repo, getOption( 'sha' ) );
} )();