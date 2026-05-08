// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns the version of the current checked-in repo's package.json
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import SimVersion from '../browser-and-node/SimVersion.js';
import winston from 'winston';
import { getPackageJSON } from './getPackageJSON.js';

// TODO: see where SimVersion.parse is used, use this instead
export const getRunnableVersion = async ( runnable: string ): Promise<SimVersion> => {
  winston.debug( `Reading version from package.json for ${runnable}` );

  return SimVersion.parse( ( await getPackageJSON( runnable ) ).version );
};