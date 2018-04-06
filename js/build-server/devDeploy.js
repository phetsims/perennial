// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';


const constants = require( './constants' );
const devSsh = require( '../common/devSsh' );
const rsync = require( 'rsync' );
const winston = require( 'winston' );
const writeFile = require( './writeFile' );

const user = constants.BUILD_SERVER_CONFIG.devUsername;
const host = constants.BUILD_SERVER_CONFIG.devDeployServer;

/**
 * Copy files to dev server, typically bayes.colorado.edu.
 *
 * @param simDir
 * @param simName
 * @param version
 * @param chipperVersion
 * @param brands
 *
 * @return Promise
 */
module.exports = async function( simDir, simName, version, chipperVersion, brands ) {
  const simVersionDirectory = constants.BUILD_SERVER_CONFIG.devDeployPath + simName + '/' + version;

  try {
    // mkdir first in case it doesn't exist already
    await devSsh( 'mkdir -p ' + simVersionDirectory );
    const buildDir = simDir + '/build';

    // copy the files
    if ( brands.includes( constants.PHET_BRAND ) ) {
      let targetDir = buildDir;
      if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
        targetDir += '/phet';
      }
      targetDir += '/.rsync-filter';

      const rsyncFilterContents = '- *_CA*\n+ *_en*\n+ *_all*\n- *.html';
      await writeFile( targetDir, rsyncFilterContents );
    }
    await new Promise( ( resolve, reject ) => {
      new rsync()
        .set( 'rsync-path', '/usr/local/bin/rsync' )
        .flags( 'razpFF' )
        .source( buildDir + '/' )
        .destination( user + '@' + host + ':' + simVersionDirectory )
        .execute( ( err, code, cmd ) => {
          if ( err ) {
            winston.debug( code );
            winston.debug( cmd );
            reject( err );
          }
          else { resolve(); }
        } );
    } );
  }
  catch
    ( err ) {
    return Promise.reject( err );
  }

  return await devSsh( 'chmod -R g+w ' + simVersionDirectory );
};