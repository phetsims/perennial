// Copyright 2022-2026, University of Colorado Boulder

/**
 * Returns whether a repo is published (not a prototype)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getPackageJSON } from './getPackageJSON.js';
import { Repo } from '../browser-and-node/PerennialTypes.js';

export const isPublished = async ( runnable: Repo ): Promise<boolean> => {
  const packageObject = await getPackageJSON( runnable );

  return !!packageObject?.phet?.published;
};