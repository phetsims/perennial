// Copyright 2022-2026, University of Colorado Boulder

/**
 * Returns whether a repo is published (not a prototype)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getPackageJSON } from './getPackageJSON.js';

export const isPublished = async ( runnable: string ): Promise<boolean> => {
  const packageObject = await getPackageJSON( runnable );

  return !!packageObject?.phet?.published;
};