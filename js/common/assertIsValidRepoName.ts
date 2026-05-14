// Copyright 2021-2026, University of Colorado Boulder

/**
 * Fails with an assertion if the string is not a valid repo name. See https://github.com/phetsims/chipper/issues/1034.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import assert from 'assert';
import { Repo } from '../browser-and-node/PerennialTypes.js';

export const assertIsValidRepoName = (
  repo: Repo
): void => {
  assert( typeof repo === 'string' && /^[a-z]+(-[a-z]+)*$/u.test( repo ), 'repo name should be composed of lowercase a-z characters, optionally with dashes used as separators' );
};
