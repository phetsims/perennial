// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns the package.json contents for a runnable off of the main checkout
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */


import { loadJSON } from './loadJSON.js';
import { PackageJSON } from '../browser-and-node/PerennialTypes.js';

export const getPackageJSON = async ( runnable: string ): Promise<PackageJSON> => {
  return loadJSON( `../${runnable}/package.json` );
};
