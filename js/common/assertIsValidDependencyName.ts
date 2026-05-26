// Copyright 2021-2026, University of Colorado Boulder

/**
 * Fails with an assertion if the string is not a valid dependency name. See https://github.com/phetsims/chipper/issues/1034.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import assert from 'assert';
import { Dependency } from '../browser-and-node/PerennialTypes.js';

export const assertIsValidDependencyName = (
  dependency: Dependency
): void => {
  assert( typeof dependency === 'string' && /^[a-z]+(-[a-z]+)*$/u.test( dependency ), 'dependency name should be composed of lowercase a-z characters, optionally with dashes used as separators' );
};
