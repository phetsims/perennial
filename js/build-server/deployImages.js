// Copyright 2020, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)

const execute = require( '../common/execute' ).default;
const gitCheckoutDirectory = require( '../common/gitCheckoutDirectory' );
const gitCloneOrFetchDirectory = require( '../common/gitCloneOrFetchDirectory' );
const gitPullDirectory = require( '../common/gitPullDirectory' );
const constants = require( './constants' );
const fs = require( 'fs' );
const axios = require( 'axios' );

const imagesReposDir = '../images-repos';
const chipperDir = `${imagesReposDir}/chipper`;
const perennialAliasDir = `${imagesReposDir}/perennial-alias`;

const processSim = async ( simulation, brands, version ) => {

  const repoDir = `${imagesReposDir}/${simulation}`;

  // Get main
  await gitCloneOrFetchDirectory( simulation, imagesReposDir );
  await gitCheckoutDirectory( 'main', repoDir );
  await gitPullDirectory( repoDir );

  let brandsArray;
  let brandsString;
  if ( brands ) {
    if ( brands.split ) {
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

const updateRepoDir = async ( repo, dir ) => {
  await gitCloneOrFetchDirectory( repo, imagesReposDir );
  await gitCheckoutDirectory( 'main', dir );
  await gitPullDirectory( dir );
  await execute( 'npm', [ 'prune' ], dir );
  await execute( 'npm', [ 'update' ], dir );
};

/**
 * This task deploys all image assets from the main branch to the latest version of all published sims. If specific
 * simulation/version options are provided, it will deploy only that specific one.
 */
const deployImages = async options => {
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

module.exports = deployImages;