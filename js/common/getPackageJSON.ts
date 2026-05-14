// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns the package.json contents for a runnable off of the main checkout
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { loadJSON } from './loadJSON.js';
import { PackageJSON, Repo } from '../browser-and-node/PerennialTypes.js';

// TODO: Perhaps get main checkout and call methods on it, rather than this? https://github.com/phetsims/totality/issues/140
export const getPackageJSON = async ( runnable: Repo ): Promise<PackageJSON> => {
  return loadJSON( `../${runnable}/package.json` );
};
