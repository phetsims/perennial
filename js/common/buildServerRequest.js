// Copyright 2017, University of Colorado Boulder

/**
 * Sends a request to the build server.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const buildLocal = require( './buildLocal' );
const assert = require( 'assert' );
const axios = require( 'axios' );
const winston = require( 'winston' );

/**
 * Sends a request to the build server.
 * @public
 *
 * @param {string} repo
 * @param {SimVersion} version
 * @param {string} branch
 * @param {Object} dependencies - Dependencies object, use getDependencies?
 * @param {Object} [options]
 * @returns {Promise} - No resolved value
 */
module.exports = async function( repo, version, branch, dependencies, options ) {

  const {
    locales = '*',
    brands = [ 'phet', 'phet-io' ],
    servers = [ 'dev' ] // {Array.<string>}, currently 'dev' and 'production' are supported
  } = options || {};

  winston.info( `sending build request for ${repo} ${version.toString()} with dependencies: ${JSON.stringify( dependencies )}` );

  servers.forEach( server => assert( [ 'dev', 'production' ].includes( server ), `Unknown server: ${server}` ) );

  const requestObject = {
    api: '2.0',
    dependencies: JSON.stringify( dependencies ),
    simName: repo,
    version: version.toString(),
    locales: locales,
    servers: servers,
    brands: brands,
    branch: branch,
    authorizationCode: buildLocal.buildServerAuthorizationCode
  };
  if ( buildLocal.buildServerNotifyEmail ) {
    requestObject.email = buildLocal.buildServerNotifyEmail;
  }

  const url = `${buildLocal.productionServerURL}/deploy-html-simulation`;

  winston.info( url );
  winston.info( JSON.stringify( requestObject ) );

  let response;
  try {
    response = await axios( { method: 'POST', url: url, data: requestObject } );
  }
  catch( error ) {
    throw new Error( `Build request failed with error ${error}.` );
  }
  if ( response.status !== 200 && response.status !== 202 ) {
    throw new Error( `Build request failed with error ${response.status}.` );
  }
  else {
    winston.info( 'Build request sent successfully' );
  }
};
