// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';

const constants = require( './constants' );
const request = require( 'request' );
const SimVersion = require( '../common/SimVersion' );
const winston = require( 'winston' );
const writeFile = require( './writeFile' );

/**
 * Write the .htaccess file to make "latest" point to the version being deployed and allow "download" links to work on Safari
 * @param simName
 * @param version
 */
module.exports = function writePhetHtaccess( simName, version ) {
  const metadataURL = constants.BUILD_SERVER_CONFIG.productionServerURL + '/services/metadata/1.2/simulations?' +
                      'format=json&type=html&summary&include-unpublished=true&simulation=' + simName;
  const pass = constants.BUILD_SERVER_CONFIG.serverToken;

  request( metadataURL, function( error, response, body ) {
    try {
      body = JSON.parse( body );
    }
      // The JSON object wasn't formatted right, bail!
    catch( e ) {
      winston.error( e );
      return;
    }
    // There was some error in the request, bail!
    if ( error ) {
      winston.error( error );
      return;
    }
    // We got an error and the simulation has already been deployed to the website, bail!
    else if ( body.error && body.error[ 0 ] !== 'No sims found with the criteria provided' ) {
      body.error.forEach( ( e ) => {winston.error( e );} );
      return;
    }
    // We did not get an error, compare the deploy request version with the website, if the request is for a later version, update it.
    else if ( !body.error ) {
      const thisVersion = SimVersion.parse( version );
      const latestVersion = SimVersion.parse( body.projects[ 0 ].version.string );
      // The requested deploy is earlier than the latest version, bail!
      if ( thisVersion.compareNumber( latestVersion ) < 0 ) {
        return;
      }
    }

    // We either got an error indicating that the simulation has not yet been deployed, or the requested version is later than the latest version
    // Update the .htaccess file that controls the /latest/ rewrite
    const contents = 'RewriteEngine on\n' +
                     'RewriteBase /sims/html/' + simName + '/\n' +
                     'RewriteRule latest(.*) ' + version + '$1\n' +
                     'Header set Access-Control-Allow-Origin "*"\n\n' +
                     'RewriteCond %{QUERY_STRING} =download\n' +
                     'RewriteRule ([^/]*)$ - [L,E=download:$1]\n' +
                     'Header onsuccess set Content-disposition "attachment; filename=%{download}e" env=download\n';
    writeFile( constants.HTML_SIMS_DIRECTORY + simName + '/.htaccess', contents );
  } ).auth( 'token', pass, true );
};