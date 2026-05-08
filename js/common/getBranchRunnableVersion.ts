// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns the version of the repo's package.json on the branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import SimVersion from '../browser-and-node/SimVersion.js';
import winston from 'winston';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';

export const getBranchRunnableVersion = async ( runnable: string, totalityBranch: string ): Promise<SimVersion> => {
  winston.debug( `Reading version from package.json for ${runnable} from ${totalityBranch}` );

  return SimVersion.parse( ( await getBranchPackageJSON( runnable, totalityBranch ) ).version );
};