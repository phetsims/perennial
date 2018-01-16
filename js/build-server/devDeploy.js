// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const child_process = require( 'child_process' );
const constants = require( './constants' );
const devScp = require( '../common/devScp' );
const devSsh = require( '../common/devSsh' );
const execute = require( '../common/execute' );

const userAtServer = constants.BUILD_SERVER_CONFIG.devUsername + '@' + constants.BUILD_SERVER_CONFIG.devDeployServer;

function scpAll( buildDir, simVersionDirectory ) {
  child_process.execSync( 'scp -r ' + buildDir + '/* ' + userAtServer + ':' + simVersionDirectory );
}

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
module.exports = async function( simDir, simName, version, chipperVersion, brands ) {
  const simVersionDirectory = constants.BUILD_SERVER_CONFIG.devDeployPath + simName + '/' + version;

  // mkdir first in case it doesn't exist already
  await devSsh( 'mkdir -p ' + simVersionDirectory );
  const buildDir = simDir + '/build';

  // copy the files
  if ( chipperVersion === '2.0.0' ) {
    scpAll( buildDir, simVersionDirectory );
    if ( brands.indexOf( constants.PHET_IO_BRAND ) >= 0 ) {
      await devScp( buildDir + '/.htaccess', simVersionDirectory + '/phet-io/wrappers/' );
    }
  }
  else {
    if ( brands.indexOf( constants.PHET_BRAND ) >= 0 ) {
      // copy english and all html and all non-html files
      await devScp( buildDir + '/' + simName + '_en.html', simVersionDirectory );
      child_process.execSync( 'find . -type f ! -iname \'*.html\' -exec scp {}' + simVersionDirectory + '\\;', { cwd: buildDir } );
    }

    if ( brands.indexOf( constants.PHET_IO_BRAND ) >= 0 ) {
      scpAll( buildDir, simVersionDirectory );
      await devScp( buildDir + '/.htaccess', simVersionDirectory + '/wrappers/' );
    }

    if ( brands.indexOf( brands.indexOf( constants.PHET_BRAND ) < 0 && brands.indexOf( constants.PHET_IO_BRAND ) < 0 ) ) {
      scpAll( buildDir, simVersionDirectory );
    }
  }

  await devSsh( 'chmod -R g+w ' + simVersionDirectory );
};