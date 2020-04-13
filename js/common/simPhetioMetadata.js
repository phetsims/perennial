// Copyright 2018, University of Colorado Boulder

/**
 * Returns phet-io metadata from the production website
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

const _ = require( 'lodash' ); // eslint-disable-line
const request = require( 'request' );
const winston = require( 'winston' );

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
      active: null, // {boolean|null} - If set, will only include active branches
      latest: null // {boolean|null} - If set, will only include active branches
    }, options );

    let metadataURL = 'https://phet.colorado.edu/services/metadata/phetio?';
    if ( options.active !== null ) {
      metadataURL += `&active=${options.active}`;
    }
    if ( options.latest !== null ) {
      metadataURL += `&latest=${options.latest}`;
    }

    winston.info( `getting phet-io metadata request with ${metadataURL}` );

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
