// Copyright 2017, University of Colorado Boulder


const constants = require( './constants' );
const sendEmail = require( './sendEmail' );
const winston = require( 'winston' );
const axios = require( 'axios' );

/**
 * Notify the website that a new sim or translation has been deployed. This will cause the project to
 * synchronize and the new translation will appear on the website.
 * @param {Object} [options]
 *  @property {string} simName
 *  @property {string} email
 *  @property {string} brand
 *  @property {string} locales
 *  @property {number} translatorId
 *  @property {Object} [phetioOptions]
 *    @property {SimVersion} version
 *    @property {string} branch
 *    @property {string} suffix
 *    @property {boolean} ignoreForAutomatedMaintenanceReleases
 */
module.exports = async function notifyServer( options ) {
  if ( options.brand === constants.PHET_BRAND ) {
    const project = `html/${options.simName}`;
    let url = `${constants.BUILD_SERVER_CONFIG.productionServerURL}/services/synchronize-project?projectName=${project}`;
    if ( options.locales && options.locales !== '*' && options.locales !== 'en' && options.locales.indexOf( ',' ) < 0 ) {
      url += `&locale=${options.locales}`;
      if ( options.translatorId ) {
        url += `&translatorId=${options.translatorId}`;
      }
    }


    let response;
    try {
      response = await axios( {
        url: url,
        auth: {
          username: 'token',
          password: constants.BUILD_SERVER_CONFIG.serverToken
        }
      } );
    }
    catch( e ) {
      throw new Error( e );
    }
    let errorMessage;

    if ( response.status >= 200 && response.status <= 299 ) {
      const data = response.data;

      if ( !data.success ) {
        errorMessage = `request to synchronize project ${project} on ${constants.BUILD_SERVER_CONFIG.productionServerURL} failed with message: ${data.error}`;
        winston.log( 'error', errorMessage );
        sendEmail( 'SYNCHRONIZE FAILED', errorMessage, options.email );
      }
      else {
        winston.log( 'info', `request to synchronize project ${project} on ${constants.BUILD_SERVER_CONFIG.productionServerURL} succeeded` );
      }
    }
    else {
      errorMessage = 'request to synchronize project errored or returned a non 2XX status code';
      winston.log( 'error', errorMessage );
      sendEmail( 'SYNCHRONIZE FAILED', errorMessage, options.email );
    }
  }
  else if ( options.brand === constants.PHET_IO_BRAND ) {
    const url = `${constants.BUILD_SERVER_CONFIG.productionServerURL}/services/metadata/phetio` +
                `?name=${options.simName
                }&versionMajor=${options.phetioOptions.version.major
                }&versionMinor=${options.phetioOptions.version.minor
                }&versionMaintenance=${options.phetioOptions.version.maintenance
                }&versionSuffix=${options.phetioOptions.suffix
                }&branch=${options.phetioOptions.branch
                }&active=${!options.phetioOptions.ignoreForAutomatedMaintenanceReleases}`;
    let response;
    try {
      response = await axios( {
        url: url,
        method: 'POST',
        auth: {
          username: 'token',
          password: constants.BUILD_SERVER_CONFIG.serverToken
        }
      } );
    }
    catch( e ) {
      throw new Error( e );
    }
    let errorMessage;

    if ( response.status < 200 || response.status > 299 ) {
      try {
        errorMessage = response.data.error;
      }
      catch( e ) {
        errorMessage = 'request to upsert phetio deployment failed';
      }
      winston.log( 'error', errorMessage );
      sendEmail( 'PHET_IO DEPLOYMENT UPSERT FAILED', errorMessage, options.email );
      throw new Error( 'PHET_IO DEPLOYMENT UPSERT FAILED' );
    }
    else {
      const data = response.data;

      if ( !data.success ) {
        try {
          errorMessage = data.error;
        }
        catch( e ) {
          errorMessage = 'request to upsert phetio deployment failed';
        }
        winston.log( 'error', errorMessage );
        sendEmail( 'SYNCHRONIZE FAILED', errorMessage, options.email );
        throw new Error( 'PHET_IO DEPLOYMENT UPSERT FAILED' );
      }
      else {
        winston.log( 'info', `request to upsert phetio deployment for ${options.simName} on ${constants.BUILD_SERVER_CONFIG.productionServerURL} succeeded` );
      }
    }

  }
  else {
    throw new Error( 'Called notifyServer for unsupported brand' );
  }
};