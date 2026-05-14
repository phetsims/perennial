// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns the package.json contents for a runnable off of the main checkout
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getFileAtBranch } from './getFileAtBranch.js';
import { Branch, PackageJSON, Repo } from '../browser-and-node/PerennialTypes.js';

export const getBranchPackageJSON = async (
  repo: Repo, // e.g. 'scenery', or 'acid-base-solutions'
  branch: Branch
): Promise<PackageJSON> => {
  return JSON.parse( await getFileAtBranch( branch, `${repo}/package.json` ) );
};
