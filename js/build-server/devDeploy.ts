// Copyright 2017-2026, University of Colorado Boulder

/**
 * Copy files to dev server, typically bayes.colorado.edu.
 *
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import constants from './constants.js';
import { devSsh } from '../common/devSsh.js';
import rsync from 'rsync';
import winston from 'winston';
import fs from 'fs';
import { ChipperVersion } from '../common/ChipperVersion.js';
import { Sim } from '../browser-and-node/PerennialTypes.js';

const user = constants.BUILD_SERVER_CONFIG.devUsername;
const host = constants.BUILD_SERVER_CONFIG.devDeployServer;

export const devDeploy = async (
  simName: Sim,
  versionString: string,
  chipperVersion: ChipperVersion,
  brands: string[],
  buildDir: string
): Promise<void> => {
  const simDirectory = constants.BUILD_SERVER_CONFIG.devDeployPath + simName;
  let versionDirectory = versionString;

  // Chipper 1.0 has -phetio in the version schema for PhET-iO branded sims
  if ( brands.length === 1 && brands[ 0 ] === constants.PHET_IO_BRAND && chipperVersion.major === 0 && !versionString.match( '-phetio' ) ) {
    versionDirectory = versionString.split( '-' ).join( '-phetio' );
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
    await fs.promises.writeFile( rsyncFilterFile, rsyncFilterContents );
  }

  await new Promise<void>( ( resolve, reject ) => {
    new rsync()
      .flags( 'razpFFO' )
      .set( 'no-perms' )
      .source( `${buildDir}/` )
      .destination( `${user}@${host}:${simVersionDirectory}` )
      .execute( ( err: Error | null, code: number, cmd: string ) => {
        if ( err ) {
          winston.debug( `${code}` );
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
