// Copyright 2017-2018, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)


const constants = require( './constants' );
const devSsh = require( '../common/devSsh' );
const rsync = require( 'rsync' );
const winston = require( 'winston' );
const writeFile = require( '../common/writeFile' );
const fs = require( 'fs' );

const user = constants.BUILD_SERVER_CONFIG.devUsername;
const host = constants.BUILD_SERVER_CONFIG.devDeployServer;

/**
 * Copy files to dev server, typically bayes.colorado.edu.
 *
 * @param {string} simDir
 * @param {string} simName
 * @param {string} version
 * @param {ChipperVersion} chipperVersion
 * @param {string[]} brands
 * @param {string} buildDir
 */
module.exports = async function devDeploy( simDir, simName, version, chipperVersion, brands, buildDir ) {
  const simDirectory = constants.BUILD_SERVER_CONFIG.devDeployPath + simName;
  let versionDirectory = version;

  // Chipper 1.0 has -phetio in the version schema for PhET-iO branded sims
  if ( brands.length === 1 && brands[ 0 ] === constants.PHET_IO_BRAND && chipperVersion.major === 0 && !version.match( '-phetio' ) ) {
    versionDirectory = version.split( '-' ).join( '-phetio' );
  }
  const simVersionDirectory = `${simDirectory}/${versionDirectory}`;

  // mkdir first in case it doesn't exist already
  await devSsh( `mkdir -p ${simVersionDirectory}` );

  // copy the files
  let rsyncFilterFile = buildDir;
  if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
    rsyncFilterFile += '/phet';
  }
  rsyncFilterFile += '/.rsync-filter';

  if ( brands.includes( constants.PHET_BRAND ) ) {
    const rsyncFilterContents = '- *_CA*\n+ *_en*\n+ *_all*\n+ *_a11y*\n- *.html';
    await writeFile( rsyncFilterFile, rsyncFilterContents );
  }

  await new Promise( ( resolve, reject ) => {
    new rsync()
      .flags( 'razpFFO' )
      .set( 'no-perms' )
      .source( `${buildDir}/` )
      .destination( `${user}@${host}:${simVersionDirectory}` )
      .execute( ( err, code, cmd ) => {
        if ( err ) {
          winston.debug( code );
          winston.debug( cmd );
          reject( err );
        }
        else { resolve(); }
      } );
  } );

  if ( brands.includes( constants.PHET_BRAND ) ) {
    fs.unlinkSync( rsyncFilterFile );
  }
};