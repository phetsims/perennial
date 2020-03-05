// Copyright 2020, University of Colorado Boulder

const gitCheckout = require( '../common/gitCheckout' );
const checkoutMasterAll = require( '../grunt/checkoutMasterAll' );
const generateImageAssets = require( '../../../chipper/grunt/generateImageAssets' );

/**
 * This task deploys all image assets from the master branch to the latest version of all published sims.
 *
 * @param options
 */
const deployImages = async options => {

  await checkoutMasterAll();
  if ( options.branch ) {
    await gitCheckout( 'chipper', options.branch );
  }
  return new Promise( ( resolve, reject ) => {
    request( 'https://phet.colorado.edu/services/metadata/1.2/simulations?format=json&summary&locale=en&type=html', function ( error, response, body ) {
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

        projects.forEach( project => {
          project.simulations.forEach( async simulation => {
            const repoDir = `../${simulation.name}`;
            await execute( 'grunt', [ `--brands=${options.brands || 'phet'}`, 'generate-image-assets' ], repoDir );

            const brands = options.brands ? options.brands.split( ',' ) : [ 'phet' ];

            brands.forEach( async brand => {
              if ( brand !== 'phet' ) {
                reject( `Image deploy not implemented for brand: ${brand}` );
              }
              else {
                const sourceDir = `${repoDir}/build/${brand}`;
                const targetDir = `${constants.HTML_SIMS_DIRECTORY}/${simulation.name}/${project.version.string}`;
                await execute( 'cp', [ '-r', sourceDir, targetDir ], '.' );
              }
            } );

          } );
        } );
      }
    } );
  } );

};

module.exports = deployImages;
