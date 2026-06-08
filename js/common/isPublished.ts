// Copyright 2022-2026, University of Colorado Boulder

/**
 * Returns whether a sim is published (not a prototype)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getPackageJSON } from './getPackageJSON.js';
import { Sim } from '../browser-and-node/PerennialTypes.js';

export const isPublished = async ( sim: Sim ): Promise<boolean> => {
  const packageObject = await getPackageJSON( sim );

  return !!packageObject?.phet?.published;
};