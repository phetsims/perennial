// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';


const constants = require( './constants' );
const devSsh = require( '../common/devSsh' );
const scp = require( 'scp' );
const walk = require( 'walk' );
const winston = require( 'winston' );

const user = constants.BUILD_SERVER_CONFIG.devUsername;
const host = constants.BUILD_SERVER_CONFIG.devDeployServer;

/**
 * Performs a recursive copy to the dev server
 * @param {String} buildDir - filepath of build directory
 * @param {String} simVersionDirectory - target filepath
 * @param {function(file:string):{boolean}} shouldFilter - shouldFilter
 * @returns {Promise<any>}
 */
async function scpAll( buildDir, simVersionDirectory, shouldFilter ) {
  if ( shouldFilter ) {
    return new Promise( ( resolve, reject ) => {
      walk.walk( buildDir ).on( 'file', ( root, fileStats, next ) => {
        const path = simVersionDirectory + root.replace( buildDir, '' );
        const file = root + '/' + fileStats.name;

        if ( !shouldFilter( file ) ) {
          winston.debug( 'Sending file "' + file + '" to dev server path "' + path + '"' );
          scp.send( { file, path, user, host }, err => {
            if ( err ) { reject( err ); }
            else { next(); }
          } );
        }
        else {
          next();
        }
      } ).on( 'errors', ( root, nodeStatsArray ) => {
        nodeStatsArray.forEach( nodeStats => {
          winston.error( JSON.stringify( nodeStats ) );
        } );
        reject( new Error( 'error during dev deploy walk' ) );
      } ).on( 'end', () => {
        resolve();
      } );
    } );
  }
  else {
    return new Promise( ( resolve, reject ) => {
      const file = buildDir + '/*';
      const path = simVersionDirectory;
      winston.debug( 'Copying ' + file + ' to ' + path );
      scp.send( { file, path, user, host }, err => {
        if ( err ) { reject( err ); }
        else { resolve(); }
      } );
    } );
  }
}

/**
 * Copy files to dev server, typically spot.colorado.edu.
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
    let shouldFilter = null;
    if ( brands.includes( constants.PHET_BRAND ) ) {
      shouldFilter = ( file ) => {
        // Do not filter file if it contains if it contains '_en' or '_all' unless it is the canadian translation.
        if ( file.includes( '_en' ) || file.includes( '_all' ) ) {
          return file.includes( '_en_CA' );
        }
        else {
          // Second check for phet brand for chipper 2.0
          if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
            return file.includes( '/phet/' ) && file.includes( '.html' );
          }
          else if ( chipperVersion.major === 0 && chipperVersion.minor === 0 ) {
            return file.includes( '.html' );
          }
        }
      };
    }
    await scpAll( buildDir, simVersionDirectory, shouldFilter );
  }
  catch
    ( err ) {
    return Promise.reject( err );
  }

  return await devSsh( 'chmod -R g+w ' + simVersionDirectory );
}
;