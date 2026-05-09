// Copyright 2026, University of Colorado Boulder

/**
 * Returns the brands of the repo's package.json on a given branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';

export const getBranchBrands = async ( repo: string, totalityBranch: string ): Promise<string[]> => {
  winston.debug( `Reading version from package.json for ${repo}` );

  return ( await getBranchPackageJSON( repo, totalityBranch ) ).phet!.supportedBrands!;
};
