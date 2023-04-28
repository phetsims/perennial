// Copyright 2018, University of Colorado Boulder

/**
 * Returns phet-io metadata from the production website
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
