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
 * @param {string} simName
 * @param {string} email
 * @param {string} brand
 * @param {Object} [phetioOptions]
 * @property {SimVersion} version
 * @property {string} branch
 * @property {string} suffix
 */
module.exports = async function notifyServer( simName, email, brand, phetioOptions ) {
  if ( brand === constants.PHET_BRAND ) {
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
  }
  else if ( brand === constants.PHET_IO_BRAND ) {
    return new Promise( ( resolve, reject ) => {
      const url = constants.BUILD_SERVER_CONFIG.productionServerURL + '/services/metadata/phetio' +
                  '?name=' + simName +
                  '&versionMajor=' + phetioOptions.version.major +
                  '&versionMinor=' + phetioOptions.version.minor +
                  '&versionMaintenance=' + phetioOptions.version.maintenance +
                  '&versionSuffix=' + phetioOptions.suffix +
                  '&branch=' + phetioOptions.branch;
      request.post( {
        url: url,
        auth: {
          user: 'token',
          pass: constants.BUILD_SERVER_CONFIG.serverToken,
          sendImmediately: true
        }
      }, function( error, response, body ) {
        let errorMessage;

        if ( error || response.statusCode < 200 || response.statusCode > 299 ) {
          try {
            errorMessage = JSON.parse( body ).error;
          }
          catch ( e ) {
            errorMessage = 'request to upsert phetio deployment failed';
          }
          winston.log( 'error', errorMessage );
          sendEmail( 'PHET_IO DEPLOYMENT UPSERT FAILED', errorMessage, email );
          return reject( 'PHET_IO DEPLOYMENT UPSERT FAILED' );
        }
        else {
          const response = JSON.parse( body );

          if ( !response.success ) {
            try {
              errorMessage = JSON.parse( body ).error;
            }
            catch ( e ) {
              errorMessage = 'request to upsert phetio deployment failed';
            }
            winston.log( 'error', errorMessage );
            sendEmail( 'SYNCHRONIZE FAILED', errorMessage, email );
            return reject( 'PHET_IO DEPLOYMENT UPSERT FAILED' );
          }
          else {
            winston.log( 'info', 'request to upsert phetio deployment for ' + simName + ' on ' + constants.BUILD_SERVER_CONFIG.productionServerName + ' succeeded' );
          }
        }

        return resolve();
      } );
    } );
  }
  else {
    return Promise.reject( 'Called notifyServer for unsupported brand' );
  }
};