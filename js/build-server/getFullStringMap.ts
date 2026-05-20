// Copyright 2023-2026, University of Colorado Boulder

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in all dependencies for a given repo
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import getDependencyRepos from '../common/getDependencyRepos.js';
import getRepoStringMap from './getRepoStringMap.js';
import { Repo } from '../browser-and-node/PerennialTypes.js';

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in all dependencies for a given repo
 *
 * @returns - {Promise.<stringMap[ stringKey ][ locale ]>}
 */
export const getFullStringMap = async (
  repo: Repo,
  checkoutDir: string
): Promise<Record<string, Record<string, string>>> => {

  let result: Record<string, Record<string, string>> = {};

  for ( const dependencyRepo of await getDependencyRepos( repo, { cwd: checkoutDir } ) ) {
    // eslint-disable-next-line phet/no-object-spread-on-non-literals
    result = { ...result, ...await getRepoStringMap( dependencyRepo, checkoutDir ) };
  }

  return result;
};
