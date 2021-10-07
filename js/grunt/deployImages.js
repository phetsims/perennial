// Copyright 2020, University of Colorado Boulder


// Copyright 2017, University of Colorado Boulder

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
 * @param {string} branch
 * @param {string} brands - CSV
 * @returns {Promise} - No resolved value
 */
module.exports = async function( branch, brands ) {
  const requestObject = {
    brands: brands || 'phet',
    branch: branch || 'master',
    authorizationCode: buildLocal.buildServerAuthorizationCode
  };
  if ( buildLocal.buildServerNotifyEmail ) {
    requestObject.email = buildLocal.buildServerNotifyEmail;
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
