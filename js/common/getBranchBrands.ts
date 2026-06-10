// Copyright 2026, University of Colorado Boulder

/**
 * Returns the brands of the repo's package.json on a given branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';
import { Branch, Runnable } from '../browser-and-node/PerennialTypes.js';

export const getBranchBrands = async ( runnable: Runnable, branch: Branch ): Promise<string[]> => {
  winston.debug( `Reading version from package.json for ${runnable}` );

  // Should only be called on runnables with phet defined in package.json, so a hard failure on nonexistence is great.
  const brands = ( await getBranchPackageJSON( runnable, branch ) ).phet!.supportedBrands;

  if ( !brands || !Array.isArray( brands ) ) {
    // This is likely chipper 1.0, so we'll manually specify the brands based on the branch name. This is not ideal, but it is better than failing.

    return branch.includes( 'phetio' ) ? [ 'phet-io' ] : [ 'phet' ];
  }

  // We'll ignore adapted-from-phet for internal processes, see https://github.com/phetsims/chipper/issues/1679
  return brands.filter( brand => brand !== 'adapted-from-phet' );
};
