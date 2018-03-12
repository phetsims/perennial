// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const constants = require( './constants' );
const fs = require( 'fs.extra' ); // eslint-disable-line
const getSortedVersionDirectories = require( './getSortedVersionDirectories' );
const parseString = require( 'xml2js' ).parseString; // eslint-disable-line
const winston = require( 'winston' );

async function getJsonFromXML( xmlString ) {
  return new Promise( ( resolve, reject ) => {
    parseString( xmlString, function( error, json ) {
      if ( error ) {
        reject( error );
      }
      else {
        resolve( json );
      }
    } );
  } );
}

/**
 * Get all of the deployed locales from the latest version before publishing the next version,
 * so we know which locales to rebuild.
 * @param {String} locales
 * @param {String} simName
 */
async function getLocales( locales, simName ) {
  let callbackLocales;

  if ( locales && locales !== '*' ) {
    // from rosetta
    callbackLocales = locales;
  }
  else {
    // from grunt deploy-production
    const simDirectory = constants.HTML_SIMS_DIRECTORY + simName;
    const versionDirectories = await getSortedVersionDirectories( simDirectory );
    if ( versionDirectories.length > 0 ) {
      const latest = versionDirectories[ versionDirectories.length - 1 ];
      const translationsXMLFile = constants.HTML_SIMS_DIRECTORY + simName + '/' + latest + '/' + simName + '.xml';
      winston.log( 'info', 'path to translations XML file = ' + translationsXMLFile );
      const xmlString = fs.readFileSync( translationsXMLFile );
      let json;
      try {
        json = await getJsonFromXML( xmlString );
      }
      catch( err ) {
        // TODO: should we call reject here? what happens when callbackLocales is undefined?
        winston.log( 'error', 'error parsing XML, err = ' + err );
      }
      winston.log( 'info', 'data extracted from translations XML file:' );
      winston.log( 'info', JSON.stringify( json, null, 2 ) );
      const simsArray = json.project.simulations[ 0 ].simulation;
      const localesArray = [];
      for ( let i = 0; i < simsArray.length; i++ ) {
        localesArray.push( simsArray[ i ].$.locale );
      }
      callbackLocales = localesArray.join( ',' );
    }
    else {
      // first deploy, sim directory will not exist yet, just publish the english version
      callbackLocales = 'en';
    }
  }

  winston.log( 'info', 'building locales=' + callbackLocales );

  return callbackLocales;
}

module.exports = getLocales;