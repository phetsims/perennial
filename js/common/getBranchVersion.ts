// Copyright 2023-2026, University of Colorado Boulder

/**
 * Returns the version of the repo's package.json on a given branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import SimVersion from '../browser-and-node/SimVersion.js';
import winston from 'winston';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';

// TODO: see where SimVersion.parse is used, use this instead
export const getBranchVersion = async ( repo: string, totalityBranch: string ): Promise<SimVersion> => {
  winston.debug( `Reading version from package.json for ${repo}` );

  return SimVersion.parse( ( await getBranchPackageJSON( repo, totalityBranch ) ).version );
};
