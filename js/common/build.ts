// Copyright 2017-2026, University of Colorado Boulder

/**
 * Builds a "repo".
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import fs from 'fs';
import winston from 'winston';
import { ChipperVersion } from './ChipperVersion.js';
import { getBuildArguments, GetBuildArgumentsOptions } from './getBuildArguments.js';
import execute from './execute.js';
import { gruntCommand } from './gruntCommand.js';
import { PackageJSON } from './perennial-types.js';

/**
 * Builds a "repo"
 *
 * TODO: support arbitrary directory for the build
 *
 * @returns - The stdout of the build
 */
export const build = async ( totalityDir: string, repo: string, options?: GetBuildArgumentsOptions ): Promise<string> => {
  winston.info( `building ${repo} at ${totalityDir}` );

  const chipperVersion = await ChipperVersion.getFromRepository();
  const args = getBuildArguments( chipperVersion, options );

  // TODO: MR patch to older sims to support this, THEN get rid of "npm ci"-ing the sim repo itself(!)
  const result = await execute( gruntCommand, [ ...args, `--repo=${repo}` ], `${totalityDir}/chipper` );

  const packageObject: PackageJSON = JSON.parse( fs.readFileSync( `${totalityDir}/${repo}/package.json`, 'utf8' ) );
  const includesPhetio = packageObject.phet && packageObject.phet.supportedBrands && packageObject.phet.supportedBrands.includes( 'phet-io' );

  // Examine output to see if getDependencies (in chipper) notices any missing phet-io things.
  // Fail out if so. Detects that specific error message.
  if ( includesPhetio && result.includes( 'WARNING404' ) ) {
    throw new Error( 'phet-io dependencies missing' );
  }

  return result;
};