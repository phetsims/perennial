// Copyright 2017, University of Colorado Boulder

/**
 * Returns metadata from the production website
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const _ = require( 'lodash' );
const winston = require( 'winston' );
const axios = require( 'axios' );

/**
 * Returns metadata from the production website.
 * @public
 *
 * @param {Object} [options]
 * @returns {Promise.<Object>} - Resolves with metadata object
 */
module.exports = async function( options ) {
  options = _.extend( {
    summary: true, // {boolean} - If set, will include a reduced amount of data for every included simulation
    type: 'html', // {string|null} - If provided (html/java/flash), will limit results to a specific type of simulation
    locale: null, // {string|null} - If provided, will limit results to a specific locale
    simulation: null, // {string|null} - If provided, will limit to a specific simulation simulation
    includePrototypes: true // {boolean} - If set, will include prototypes
  }, options );

  let metadataURL = 'https://phet.colorado.edu/services/metadata/1.3/simulations?format=json';
  if ( options.summary ) {
    metadataURL += '&summary';
  }
  if ( options.includePrototypes ) {
    metadataURL += '&includePrototypes';
  }
  if ( options.type ) {
    metadataURL += `&type=${options.type}`;
  }
  if ( options.locale ) {
    metadataURL += `&locale=${options.locale}`;
  }
  if ( options.simulation ) {
    metadataURL += `&simulation=${options.simulation}`;
  }

  winston.info( `getting metadata request with ${metadataURL}` );

  let response;
  try {
    response = await axios( metadataURL );
  }
  catch( e ) {
    throw new Error( `metadata request failed with ${e}` );
  }
  if ( response.status !== 200 ) {
    throw new Error( `metadata request failed with status ${response.status} ${response}` );
  }
  else {
    return response.data;
  }
};
