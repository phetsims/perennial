// Copyright 2020-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import execute from '../common/execute.js';
import constants from './constants.js';
import fs from 'fs';
import axios from 'axios';
import { Checkout } from '../common/Checkout.js';
import SimVersion from '../browser-and-node/SimVersion.js';

const imagesReposDir = '../images-repos';

type DeployImagesOptions = {
  simulation?: string;
  version?: string;
};

const processSim = async (
  simName: string,
  versionString: string
): Promise<void> => {

  const simVersion = SimVersion.parse( versionString );
  const releaseBranch = await Checkout.getReleaseBranch( simName, `${simVersion.major}.${simVersion.minor}` );

  const repoDir = `${imagesReposDir}/${simName}`;

  // Build screenshots
  await execute( 'grunt', [ `--brands=${releaseBranch.brands.join( ',' )}`, `--repo=${simName}`, 'build-images' ], `${imagesReposDir}/chipper` );

  // Copy into the document root
  for ( const brand of releaseBranch.brands ) {
    if ( brand !== 'phet' ) {
      console.log( `Skipping images for unsupported brand: ${brand}` );
    }
    else {
      const sourceDir = `${repoDir}/build/${brand}/`;
      const targetDir = `${constants.HTML_SIMS_DIRECTORY}${simName}/${versionString}/`;
      const files = fs.readdirSync( sourceDir );
      for ( const file of files ) {
        if ( file.endsWith( 'png' ) ) {
          console.log( `copying file ${file}` );
          await execute( 'cp', [ `${sourceDir}${file}`, `${targetDir}${file}` ], '.' );
        }
      }

      console.log( `Done copying files for ${simName} ${versionString}` );
    }
  }
};

/**
 * This task deploys all image assets from the main branch to the latest version of all published sims. If specific
 * simulation/version options are provided, it will deploy only that specific one.
 */
export const deployImages = async ( options: DeployImagesOptions ): Promise<void> => {

  const mainCheckout = await Checkout.getMainCheckout();

  await mainCheckout.gitPull();
  await mainCheckout.npmUpdate();

  console.log( 'deploying images' );
  if ( !fs.existsSync( imagesReposDir ) ) {
    await execute( 'mkdir', [ imagesReposDir ], '.' );
  }

  if ( options.simulation && options.version ) {
    await processSim( options.simulation, options.version );
  }
  else {

    // Get all published sims
    const response = await axios( 'https://phet.colorado.edu/services/metadata/1.2/simulations?format=json&summary&locale=en&type=html' );

    if ( response.status < 200 || response.status > 299 ) {
      throw new Error( `Bad Status while fetching metadata: ${response.status}` );
    }
    else {
      const projects = response.data.projects;

      // Use for index loop to allow async/await
      for ( const project of projects ) {
        for ( const simulation of project.simulations ) {
          await processSim( simulation.name, project.version.string );
        }
      }
    }
  }
};
