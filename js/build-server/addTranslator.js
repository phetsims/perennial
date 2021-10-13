// Copyright 2017, University of Colorado Boulder


const constants = require( './constants' );
const winston = require( 'winston' );
const axios = require( 'axios' );

/**
 * define a helper function that will add the translator to the DB for translation credits
 *
 * @param locale
 * @param simName
 * @param translatorId
 */
module.exports = async function addTranslator( locale, simName, translatorId ) {
  // create the URL
  const addTranslatorURL = `${constants.BUILD_SERVER_CONFIG.productionServerURL}/services/add-html-translator?simName=${simName}&locale=${locale}&userId=${translatorId}&authorizationCode=${constants.BUILD_SERVER_CONFIG.databaseAuthorizationCode}`;

  // log the URL
  winston.log( 'info', `URL for adding translator to credits = ${addTranslatorURL}` );

  // send the request
  try {
    const response = await axios( addTranslatorURL );
    winston.log( 'info', `request to add translator credit info returned code: ${response.status}` );
  }
  catch( error ) {
    winston.log( 'error', `error occurred when attempting to add translator credit info to DB: ${error}` );
  }
};