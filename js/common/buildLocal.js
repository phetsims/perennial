// Copyright 2017, University of Colorado Boulder

/**
 * Settings defined in buildLocal
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const assert = require( 'assert' );
const fs = require( 'fs' );
const winston = require( 'winston' );

// Handle the lack of build.json
var buildLocalObject;
try {
  buildLocalObject = JSON.parse( fs.readFileSync( process.env.HOME + '/.phet/build-local.json', 'utf8' ) );
} 
catch ( e ) {
  winston.warn( 'No build-local.json detected!' );
  buildLocalObject = {};
}

module.exports = {
  get devUsername() {
    assert( buildLocalObject.devUsername );
    return buildLocalObject.devUsername;
  },
  get buildServerAuthorizationCode() {
    assert( buildLocalObject.buildServerAuthorizationCode );
    return buildLocalObject.buildServerAuthorizationCode;
  },
  devDeployServer: buildLocalObject.devDeployServer || 'spot.colorado.edu',
  devDeployPath: buildLocalObject.devDeployPath || '/htdocs/physics/phet/dev/html/',
  buildServerNotifyEmail: buildLocalObject.buildServerNotifyEmail || null,
  productionServerURL: buildLocalObject.productionServerURL || 'https://phet.colorado.edu'
};
