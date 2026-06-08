// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns the version of the repo's package.json on the branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import SimVersion from '../browser-and-node/SimVersion.js';
import winston from 'winston';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';
import { Branch, Runnable } from '../browser-and-node/PerennialTypes.js';

export const getBranchSimVersion = async ( runnable: Runnable, branch: Branch ): Promise<SimVersion> => {
  winston.debug( `Reading version from package.json for ${runnable} from ${branch}` );

  return SimVersion.parse( ( await getBranchPackageJSON( runnable, branch ) ).version );
};