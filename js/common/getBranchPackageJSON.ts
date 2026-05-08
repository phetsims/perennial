// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns the package.json contents for a runnable off of the main checkout
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { PackageJSON } from './perennial-types.js';
import { getFileAtBranch } from './getFileAtBranch.js';

export const getBranchPackageJSON = async (
  directory: string, // e.g. 'scenery', or 'acid-base-solutions'
  totalityBranch: string
): Promise<PackageJSON> => {
  return JSON.parse( await getFileAtBranch( totalityBranch, `${directory}/package.json` ) );
};
