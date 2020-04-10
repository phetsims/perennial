// Copyright 2020, University of Colorado Boulder

const constants = require( './constants' );
const execute = require( '../common/execute' );
const gitCheckout = require( '../common/gitCheckout' );
const gitPull = require( '../common/gitPull' );
const request = require( 'request' );

const chipperDir = '../chipper';

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

  return new Promise( ( resolve, reject ) => {

    // Get all published sims
    request( 'https://phet.colorado.edu/services/metadata/1.2/simulations?format=json&summary&locale=en&type=html', async function ( error, response, body ) {
      if ( error ) {
        console.error( 'failed to fetch metadata request', e );
        reject( e );
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
        catch ( e ) {
          console.error( 'failed to parse json from metadata request', e );
          reject( e );
          return;
        }

        // Use for index loop to allow async/await
        for ( let projectIndex = 0; projectIndex < projects.length; projectIndex++ ) {
          const project = projects[ projectIndex ];
          for ( let simulationIndex = 0; simulationIndex < project.simulations.length; simulationIndex++ ) {
            const simulation = project.simulations[ simulationIndex ];
            const repoDir = `../${simulation.name}`;

            // Get master
            await gitCheckout( simulation.name, 'master' );
            await gitPull( simulation.name );

            // Build screenshots
            await execute( 'grunt', [ `--brands=${options.brands || 'phet'}`, `--repo=${simulation.name}`, 'build-images' ], chipperDir );

            // Copy into the document root
            const brands = options.brands ? options.brands.split( ',' ) : [ 'phet' ];
            for ( brandIndex = 0; brandIndex < brands.length; brandIndex++ ) {
              const brand = brands[ brandIndex ];
              if ( brand !== 'phet' ) {
                reject( `Image deploy not implemented for brand: ${brand}` );
              }
              else {
                const sourceDir = `${repoDir}/build/${brand}/*`;
                const targetDir = `${constants.HTML_SIMS_DIRECTORY}${simulation.name}/${project.version.string}/`;
                await execute( 'cp', [ '-r', sourceDir, targetDir ], '.' );
              }
            }
          }
        }
      }
    } );
  } );

};

module.exports = deployImages;
