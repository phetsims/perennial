// Copyright 2020, University of Colorado Boulder

/**
 * Sends a request to the build server.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

// modules
const buildLocal = require( '../common/buildLocal' );
const winston = require( 'winston' );
const axios = require( 'axios' );

/**
 * Sends a request to the build server.
 * @public
 *
 * @param {Object} [options]
 * @property {string} options.branch
 * @property {string} options.brands - CSV
 * @property {string} options.simulation - sim name
 * @returns {Promise} - No resolved value
 */
const deployImages = async function( { branch, brands, simulation } ) {
  const requestObject = {
    brands: brands || 'phet',
    branch: branch || 'master',
    authorizationCode: buildLocal.buildServerAuthorizationCode
  };
  if ( buildLocal.buildServerNotifyEmail ) {
    requestObject.email = buildLocal.buildServerNotifyEmail;
  }
  if ( simulation ) {
    requestObject.simulation = simulation;
    try {
      const metadataResponse = await axios.get( `https://phet.colorado.edu/services/metadata/1.2/simulations?format=json&summary&locale=en&type=html&simulation=${simulation}` );
      if ( metadataResponse.data && metadataResponse.data?.projects?.[ 0 ]?.version?.string ) {
        requestObject.version = metadataResponse.data.projects[ 0 ].version.string;
      }
      else {
        console.error( 'Unable to find version for simulation', metadataResponse.data );
        return;
      }
    }
    catch( e ) {
      console.error( 'Unable to deploy images for sim due to error in metadata retrival', e );
      return;
    }
  }

  winston.info( `sending image deploy request for ${requestObject.branch}, ${requestObject.brands}` );

  const url = `${buildLocal.productionServerURL}/deploy-images`;

  winston.info( url );
  winston.info( JSON.stringify( requestObject ) );

  let response;
  try {
    response = await axios( { method: 'post', url: url, data: requestObject } );
  }
  catch( error ) {
    throw new Error( `Image deploy request failed with error ${error}.` );
  }

  if ( response.status !== 200 && response.status !== 202 ) {
    throw new Error( `Image deploy request failed with status code ${response.status}.` );
  }
  else {
    winston.info( 'Image deploy request sent successfully.  If additional alternative images were deployed, go to the main admin page and trigger a recount.' );
  }
};

module.exports = deployImages;