// Copyright 2026, University of Colorado Boulder

/**
 * Returns the brands of the repo's package.json on a given branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';
import { getBranchSimVersion } from './getBranchSimVersion.js';

export const getBranchBrands = async ( repo: string, totalityBranch: string ): Promise<string[]> => {
  winston.debug( `Reading version from package.json for ${repo}` );

  const brands = ( await getBranchPackageJSON( repo, totalityBranch ) ).phet!.supportedBrands;

  if ( !brands || !Array.isArray( brands ) ) {
    // This is likely chipper 1.0, so we'll manually specify the brands based on the branch name. This is not ideal, but it is better than failing.

    return totalityBranch.includes( 'phetio' ) ? [ 'phet-io' ] : [ 'phet' ];
  }

  return brands;
};
