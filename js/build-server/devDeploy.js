// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const constants = require( './constants' );
const devScp = require( '../common/devScp' );
const devSsh = require( '../common/devSsh' );
const execute = require( '../common/execute' );

/**
 * Copy files to dev server, typically spot.colorado.edu.
 *
 * @param simDir
 * @param simName
 * @param version
 * @param brands
 * @param api
 *
 * @return Promise
 */
module.exports = async function( simDir, simName, version, brands, api ) {
  const userAtServer = constants.BUILD_SERVER_CONFIG.devUsername + '@' + constants.BUILD_SERVER_CONFIG.devDeployServer;
  const simVersionDirectory = constants.BUILD_SERVER_CONFIG.devDeployPath + simName + '/' + version;

  // mkdir first in case it doesn't exist already
  await devSsh( 'mkdir -p ' + simVersionDirectory );
  const buildDir = simDir + '/build';

  const scpTarget = userAtServer + ':' + simVersionDirectory;

  // copy the files
  if ( api !== '1.0' ) {
    // TODO: filter out translations?
    await devScp( buildDir + '/*', scpTarget );
    if ( brands.indexOf( constants.PHET_IO_BRAND ) >= 0 ) {
      await devScp( buildDir + '/.htaccess', scpTarget + '/phet-io/wrappers/' );
    }
  }
  else {
    if ( brands.indexOf( constants.PHET_BRAND ) >= 0 ) {
      // copy english and all html and all non-html files
      await devScp( buildDir + '/' + simName + '_en.html ', scpTarget );
      await execute( 'find', [ '.', '-type', 'f', '!', '-iname', '\'*.html\'', '-exec', 'scp', '{}', scpTarget, '\\;' ], buildDir );
    }

    if ( brands.indexOf( constants.PHET_IO_BRAND ) >= 0 ) {
      await devScp( buildDir + '/*', scpTarget );
      await devScp( buildDir + '/.htaccess', scpTarget + '/wrappers/' );
    }

    if ( brands.indexOf( brands.indexOf( constants.PHET_BRAND ) < 0 && brands.indexOf( constants.PHET_IO_BRAND ) < 0 ) ) {
      await devScp( buildDir + '/*', scpTarget );
    }
  }

  await devSsh( 'chmod -R g+w ' + simVersionDirectory );
};