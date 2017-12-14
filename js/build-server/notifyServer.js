// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const constants = require( './constants' );
const request = require( 'request' );
const sendEmail = require( './sendEmail' );
const winston = require( 'winston' );

/**
 * Notify the website that a new sim or translation has been deployed. This will cause the project to
 * synchronize and the new translation will appear on the website.
 * @param simName
 * @param email
 */
module.exports = async function notifyServer( simName, email ) {
  return new Promise( ( resolve ) => {
    const project = 'html/' + simName;
    const url = constants.BUILD_SERVER_CONFIG.productionServerURL + '/services/synchronize-project?projectName=' + project;
    request( {
      url: url,
      auth: {
        user: 'token',
        pass: constants.BUILD_SERVER_CONFIG.serverToken,
        sendImmediately: true
      }
    }, function( error, response, body ) {
      let errorMessage;

      if ( !error && response.statusCode === 200 ) {
        const syncResponse = JSON.parse( body );

        if ( !syncResponse.success ) {
          errorMessage = 'request to synchronize project ' + project + ' on ' + constants.BUILD_SERVER_CONFIG.productionServerName + ' failed with message: ' + syncResponse.error;
          winston.log( 'error', errorMessage );
          sendEmail( 'SYNCHRONIZE FAILED', errorMessage, email );
        }
        else {
          winston.log( 'info', 'request to synchronize project ' + project + ' on ' + constants.BUILD_SERVER_CONFIG.productionServerName + ' succeeded' );
        }
      }
      else {
        errorMessage = 'request to synchronize project errored or returned a non 200 status code';
        winston.log( 'error', errorMessage );
        sendEmail( 'SYNCHRONIZE FAILED', errorMessage, email );
      }

      return resolve();
    } );
  } );
};