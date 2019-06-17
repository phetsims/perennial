// Copyright 2017, University of Colorado Boulder

/**
 * Settings defined in buildLocal
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

// modules
const assert = require( 'assert' );
const fs = require( 'fs' );
const winston = require( 'winston' );

// Handle the lack of build.json
let buildLocalObject;
try {
  buildLocalObject = JSON.parse( fs.readFileSync( process.env.HOME + '/.phet/build-local.json', 'utf8' ) );
}
catch( e ) {
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

  // Wrappers are now deployed to the dev location (for convenience)
  devDeployServer: buildLocalObject.devDeployServer || 'bayes.colorado.edu',
  devDeployPath: buildLocalObject.devDeployPath || '/data/web/htdocs/dev/html/',
  buildServerNotifyEmail: buildLocalObject.buildServerNotifyEmail || null,
  productionServerURL: buildLocalObject.productionServerURL || 'https://phet.colorado.edu',
  localTestingURL: buildLocalObject.localTestingURL || null
};
