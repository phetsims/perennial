// Copyright 2020-2026, University of Colorado Boulder

/**
 * Updates the development/test HTML as needed for a change in the version. Updates are based on the version in the
 * package.json. This will also commit if an update occurs.
 *
 * See https://github.com/phetsims/chipper/issues/926
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';
import { gitIsClean } from './gitIsClean.js';
import { loadJSON } from './loadJSON.js';
import { gruntCommand } from './gruntCommand.js';
import { gitAdd } from './gitAdd.js';
import { gitCommit } from './gitCommit.js';
import { PackageJSON } from './perennial-types.js';

export const updateHTMLVersion = async( runnable: string ): Promise<void> => {
  winston.info( `Updating HTML for ${runnable} with the new version strings` );

  const isClean = await gitIsClean();
  if ( !isClean ) {
    throw new Error( `Unclean status in ${runnable}, cannot clean up HTML` );
  }

  // We'll want to update development/test HTML as necessary, since they'll include the version
  const packageObject: PackageJSON = await loadJSON( `../${runnable}/package.json` );
  await execute( gruntCommand, [ 'generate-development-html', `--repo=${runnable}` ], '../chipper' );
  await gitAdd( `${runnable}/${runnable}_en.html` );

  if ( packageObject.phet?.generatedUnitTests ) {
    await execute( gruntCommand, [ 'generate-test-html', `--repo=${runnable}` ], '../chipper' );
    await gitAdd( `${runnable}/${runnable}-tests.html` );
  }
  if ( !( await gitIsClean( runnable ) ) ) {
    await gitCommit( `Bumping ${runnable} dev${packageObject.phet?.generatedUnitTests ? '/test' : ''} HTML with new version` );
  }
};
