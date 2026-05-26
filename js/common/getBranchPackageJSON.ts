// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns the package.json contents for a dependency off of the main checkout
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getFileAtBranch } from './getFileAtBranch.js';
import { Branch, Dependency, PackageJSON } from '../browser-and-node/PerennialTypes.js';

export const getBranchPackageJSON = async (
  dependency: Dependency, // e.g. 'scenery', or 'acid-base-solutions'
  branch: Branch
): Promise<PackageJSON> => {
  return JSON.parse( await getFileAtBranch( branch, `${dependency}/package.json` ) );
};
