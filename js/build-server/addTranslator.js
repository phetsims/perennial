// Copyright 2017, University of Colorado Boulder

'use strict';

const constants = require( './constants' );
const request = require( 'request' );
const winston = require( 'winston' );

/**
 * define a helper function that will add the translator to the DB for translation credits
 *
 * @param locale
 * @param simName
 * @param translatorId
 */
module.exports = async function addTranslator( locale, simName, translatorId ) {
  return new Promise( ( resolve ) => {
    // create the URL
    const addTranslatorURL = constants.BUILD_SERVER_CONFIG.productionServerURL + '/services/add-html-translator?simName=' + simName +
                             '&locale=' + locale + '&userId=' + translatorId + '&authorizationCode=' +
                             constants.BUILD_SERVER_CONFIG.databaseAuthorizationCode;

    // log the URL
    winston.log( 'info', 'URL for adding translator to credits = ' + addTranslatorURL );

    // send the request
    request( addTranslatorURL, function( error, response ) {
      if ( error ) {
        winston.log( 'error', 'error occurred when attempting to add translator credit info to DB: ' + error );
      }
      else {
        winston.log( 'info', 'request to add translator credit info returned code: ' + response.statusCode );
      }
      return resolve();
    } );
  } );
};