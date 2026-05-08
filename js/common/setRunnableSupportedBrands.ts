// Copyright 2023-2026, University of Colorado Boulder

import { gitIsClean } from './gitIsClean.js';
import { loadJSON } from './loadJSON.js';
import { getPackageJSON } from './getPackageJSON.js';
import { writeJSON } from './writeJSON.js';
import { gitAdd } from './gitAdd.js';
import { gitCommit } from './gitCommit.js';

/**
 * Sets the supported brands of the current checked-in repo's package.json, creating a commit with the change
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

const winston = require( 'winston' );

// const gitAdd = require( './gitAdd' );
// const gitCommit = require( './gitCommit' );
// const gitIsClean = require( './gitIsClean' );
// const loadJSON = require( './loadJSON' );
// const writeJSON = require( './writeJSON' );

/**
 * Sets the supported brands of the current checked-in repo's package.json, creating a commit with the change
 *
 * @param runnable - The runnable name
 * @param brands
 * @param [message] - Optional. If provided, appended at the end
 */
export const setRunnableSupportedBrands = async ( runnable: string, brands: string[], message?: string ): Promise<void> => {
  winston.info( `Setting supported brands from package.json for ${runnable} to ${brands}` );

  const packageFile = `../${runnable}/package.json`;

  const isClean = await gitIsClean();
  if ( !isClean ) {
    throw new Error( `Unclean status in ${runnable}, cannot increment version` );
  }

  const packageJSON = await getPackageJSON( runnable );
  packageJSON.phet = packageJSON.phet || {};
  packageJSON.phet.supportedBrands = brands;

  await writeJSON( packageFile, packageJSON );
  await gitAdd( `${runnable}/package.json` );
  await gitCommit( `Updating supported brands to [${brands}]${message ? `, ${message}` : ''}` );
};
