// Copyright 2017, University of Colorado Boulder

'use strict';

const constants = require( './constants' );
const request = require( 'request' );
const sendEmail = require( './sendEmail' );
const winston = require( 'winston' );

/**
 * Notify the website that a new sim or translation has been deployed. This will cause the project to
 * synchronize and the new translation will appear on the website.
 * @param {Object} options
 *  @property {string} simName
 *  @property {string} email
 *  @property {string} brand
 *  @property {string} locales
 *  @property {Object} [phetioOptions]
 *    @property {SimVersion} version
 *    @property {string} branch
 *    @property {string} suffix
 *    @property {boolean} ignoreForAutomatedMaintenanceReleases
 */
module.exports = async function notifyServer( options ) {
  if ( options.brand === constants.PHET_BRAND ) {
    return new Promise( ( resolve ) => {
      const project = 'html/' + options.simName;
      let url = constants.BUILD_SERVER_CONFIG.productionServerURL + '/services/synchronize-project?projectName=' + project;
      if ( options.locales && options.locales !== '*' && options.locales !== 'en' && options.locales.indexOf( ',' ) < 0 ) {
        url += '&locale=' + options.locales;
      }
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
            sendEmail( 'SYNCHRONIZE FAILED', errorMessage, options.email );
          }
          else {
            winston.log( 'info', 'request to synchronize project ' + project + ' on ' + constants.BUILD_SERVER_CONFIG.productionServerName + ' succeeded' );
          }
        }
        else {
          errorMessage = 'request to synchronize project errored or returned a non 200 status code';
          winston.log( 'error', errorMessage );
          sendEmail( 'SYNCHRONIZE FAILED', errorMessage, options.email );
        }

        return resolve();
      } );
    } );
  }
  else if ( options.brand === constants.PHET_IO_BRAND ) {
    return new Promise( ( resolve, reject ) => {
      const url = constants.BUILD_SERVER_CONFIG.productionServerURL + '/services/metadata/phetio' +
                  '?name=' + options.simName +
                  '&versionMajor=' + options.phetioOptions.version.major +
                  '&versionMinor=' + options.phetioOptions.version.minor +
                  '&versionMaintenance=' + options.phetioOptions.version.maintenance +
                  '&versionSuffix=' + options.phetioOptions.suffix +
                  '&branch=' + options.phetioOptions.branch +
                  '&ignoreForAutomatedMaintenanceReleases=' + options.phetioOptions.ignoreForAutomatedMaintenanceReleases;
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
          catch( e ) {
            errorMessage = 'request to upsert phetio deployment failed';
          }
          winston.log( 'error', errorMessage );
          sendEmail( 'PHET_IO DEPLOYMENT UPSERT FAILED', errorMessage, options.email );
          return reject( 'PHET_IO DEPLOYMENT UPSERT FAILED' );
        }
        else {
          const response = JSON.parse( body );

          if ( !response.success ) {
            try {
              errorMessage = JSON.parse( body ).error;
            }
            catch( e ) {
              errorMessage = 'request to upsert phetio deployment failed';
            }
            winston.log( 'error', errorMessage );
            sendEmail( 'SYNCHRONIZE FAILED', errorMessage, options.email );
            return reject( 'PHET_IO DEPLOYMENT UPSERT FAILED' );
          }
          else {
            winston.log( 'info', 'request to upsert phetio deployment for ' + options.simName + ' on ' + constants.BUILD_SERVER_CONFIG.productionServerName + ' succeeded' );
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