// Copyright 2020-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import execute from '../common/execute.js';
import { gitCheckoutDirectory } from '../common/git/gitCheckoutDirectory.js';
import { gitCloneDirectory } from '../common/git/gitCloneDirectory.js';
import { gitPullDirectory } from '../common/git/gitPullDirectory.js';
import { npmUpdateDirectory } from '../common/npmUpdateDirectory.js';
import constants from './constants.js';
import fs from 'fs';
import axios from 'axios';

const imagesReposDir = '../images-repos';
const chipperDir = `${imagesReposDir}/chipper`;
const perennialAliasDir = `${imagesReposDir}/perennial-alias`;

type DeployImagesOptions = {
  simulation?: string;
  brands?: string[] | string;
  version?: string;
};

const cloneOrFetchDirectory = async ( repo: string, directory: string ): Promise<void> => {
  const repoDir = `${directory}/${repo}`;
  if ( fs.existsSync( repoDir ) ) {
    await gitPullDirectory( repoDir );
  }
  else {
    await gitCloneDirectory( repo as any, directory );
  }
};

const processSim = async ( simulation: string, brands: string[] | string | undefined, version: string ): Promise<void> => {

  const repoDir = `${imagesReposDir}/${simulation}`;

  // Get main
  // TODO: This replaced the removed legacy gitCloneOrFetchDirectory helper with a minimal equivalent.
  await cloneOrFetchDirectory( simulation, imagesReposDir );
  await gitCheckoutDirectory( 'main', repoDir );
  await gitPullDirectory( repoDir );

  let brandsArray: string[];
  let brandsString: string;
  if ( brands ) {
    if ( typeof brands === 'string' ) {
      brandsArray = brands.split( ',' );
      brandsString = brands;
    }
    else {
      brandsArray = brands;
      brandsString = brands.join( ',' );
    }
  }
  else {
    brandsString = 'phet';
    brandsArray = [ brandsString ];
  }

  // Build screenshots
  await execute( 'grunt', [ `--brands=${brandsString}`, `--repo=${simulation}`, 'build-images' ], chipperDir );

  // Copy into the document root
  for ( const brand of brandsArray ) {
    if ( brand !== 'phet' ) {
      console.log( `Skipping images for unsupported brand: ${brand}` );
    }
    else {
      const sourceDir = `${repoDir}/build/${brand}/`;
      const targetDir = `${constants.HTML_SIMS_DIRECTORY}${simulation}/${version}/`;
      const files = fs.readdirSync( sourceDir );
      for ( const file of files ) {
        if ( file.endsWith( 'png' ) ) {
          console.log( `copying file ${file}` );
          await execute( 'cp', [ `${sourceDir}${file}`, `${targetDir}${file}` ], '.' );
        }
      }

      console.log( `Done copying files for ${simulation}` );
    }
  }
};

const updateRepoDir = async ( repo: string, dir: string ): Promise<void> => {
  // TODO: This replaced the removed legacy gitCloneOrFetchDirectory helper with a minimal equivalent.
  await cloneOrFetchDirectory( repo, imagesReposDir );
  await gitCheckoutDirectory( 'main', dir );
  await gitPullDirectory( dir );
  await npmUpdateDirectory( dir );
};

/**
 * This task deploys all image assets from the main branch to the latest version of all published sims. If specific
 * simulation/version options are provided, it will deploy only that specific one.
 */
export const deployImages = async ( options: DeployImagesOptions ): Promise<void> => {
  console.log( `deploying images with brands ${options.brands}` );
  if ( !fs.existsSync( imagesReposDir ) ) {
    await execute( 'mkdir', [ imagesReposDir ], '.' );
  }

  await updateRepoDir( 'chipper', chipperDir );
  await updateRepoDir( 'perennial-alias', perennialAliasDir );

  if ( options.simulation && options.version ) {
    await processSim( options.simulation, options.brands, options.version );
  }
  else {

    // Get all published sims
    let response;
    try {
      response = await axios( 'https://phet.colorado.edu/services/metadata/1.2/simulations?format=json&summary&locale=en&type=html' );
    }
    catch( e ) {
      throw new Error( e );
    }
    if ( response.status < 200 || response.status > 299 ) {
      throw new Error( `Bad Status while fetching metadata: ${response.status}` );
    }
    else {
      let projects;
      try {
        projects = response.data.projects;
      }
      catch( e ) {
        throw new Error( e );
      }

      // Use for index loop to allow async/await
      for ( const project of projects ) {
        for ( const simulation of project.simulations ) {
          await processSim( simulation.name, options.brands, project.version.string );
        }
      }
    }
  }
};
