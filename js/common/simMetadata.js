// Copyright 2017, University of Colorado Boulder

/**
 * Returns metadata from the production website
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

// modules
const request = require( 'request' );
const winston = require( 'winston' );
const _ = require( 'lodash' ); // eslint-disable-line

/**
 * Returns metadata from the production website.
 * @public
 *
 * @param {Object} [options]
 * @returns {Promise.<Object>} - Resolves with metadata object
 */
module.exports = function( options ) {
  return new Promise( ( resolve, reject ) => {
    options = _.extend( {
      summary: false, // {boolean} - If set, will include a reduced amount of data for every included simulation
      type: 'html', // {string|null} - If provided (html/java/flash), will limit results to a specific type of simulation
      locale: null, // {string|null} - If provided, will limit results to a specific locale
      simulation: null // {string|null} - If provided, will limit to a specific simulation simulation
    }, options );

    var metadataURL = 'https://phet.colorado.edu/services/metadata/1.0/simulations?format=json';
    if ( options.summary ) {
      metadataURL += '&summary';
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

    request( metadataURL, ( requestError, requestResponse, requestBody ) => {
      if ( requestError || requestResponse.statusCode !== 200 ) {
        reject( new Error( `metadata request failed with ${requestResponse.statusCode}: ${requestError}` ) );
      }
      else {
        resolve( JSON.parse( requestBody ) );
      }
    } );
  } );
};
