// Copyright 2020, University of Colorado Boulder

const constants = require( './constants' );
const execute = require( '../common/execute' );
const fs = require( 'fs' );
const gitCheckout = require( '../common/gitCheckout' );
const gitPull = require( '../common/gitPull' );
const request = require( 'request' );

const chipperDir = '../chipper';

const processSim = async ( simulation, brands, version ) => {

  const repoDir = `../${simulation}`;

  // Get master
  await gitCheckout( simulation, 'master' );
  await gitPull( simulation );

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
/**
 * This task deploys all image assets from the master branch to the latest version of all published sims.
 *
 * @param options
 */
const deployImages = async options => {
  console.log( `deploying images with branch ${options.branch}, brands ${options.brands}` );
  if ( options.branch ) {
    await gitCheckout( 'chipper', options.branch );
    await gitPull( 'chipper' );
    await execute( 'npm', [ 'prune' ], chipperDir );
    await execute( 'npm', [ 'update' ], chipperDir );
  }

  if ( options.simulation && options.version ) {
    return processSim( options.simulation, options.brands, options.version );
  }
  else {
    return new Promise( ( resolve, reject ) => {
      try {

        // Get all published sims
        request( 'https://phet.colorado.edu/services/metadata/1.2/simulations?format=json&summary&locale=en&type=html', async ( error, response, body ) => {
          if ( error ) {
            console.error( 'failed to fetch metadata request', error );
            reject( error );
          }
          else if ( response.statusCode < 200 || response.statusCode > 299 ) {
            console.error( 'Bad Status while fetching metadata', response.statusCode );
            reject( 'Bad Status while fetching metadata' );
          }
          else {
            let projects;
            try {
              projects = JSON.parse( body ).projects;
            }
            catch( e ) {
              console.error( 'failed to parse json from metadata request', e );
              reject( e );
              return;
            }

            // Use for index loop to allow async/await
            for ( const project of projects ) {
              for ( const simulation of project.simulations ) {
                await processSim( simulation.name, options.brands, project.version.string );
              }
            }

            resolve();
          }
        } );
      }
      catch( e ) {
        reject( e );
      }
    } );
  }

};

module.exports = deployImages;
