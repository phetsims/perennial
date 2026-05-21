// Copyright 2023-2026, University of Colorado Boulder

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in all dependencies for a given repo
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getRepoStringMap } from './getRepoStringMap.js';
import { ReleaseBranch } from '../common/ReleaseBranch.js';
import fs from 'fs';

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in all dependencies for a given repo
 *
 * @returns - {Promise.<stringMap[ stringKey ][ locale ]>}
 */
export const getFullStringMap = async (
  releaseBranch: ReleaseBranch
): Promise<Record<string, Record<string, string>>> => {

  let result: Record<string, Record<string, string>> = {};

  // dependency repos are the exact set of repos that are provided in the checkout, so we can use the checkout's working directory to get the dependencies.json file
  const dependencyRepos = await fs.promises.readdir( releaseBranch.checkout.workingDirectory );

  for ( const dependencyRepo of dependencyRepos ) {
    // eslint-disable-next-line phet/no-object-spread-on-non-literals
    result = { ...result, ...await getRepoStringMap( dependencyRepo, releaseBranch.checkout.workingDirectory ) };
  }

  return result;
};
