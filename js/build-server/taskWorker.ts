// Copyright 2017-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import constants from './constants.js';
import { createTranslationsXML } from './createTranslationsXML.js';
import { devDeploy } from './devDeploy.js';
import execute from '../common/execute.js';
import fs from 'fs';
import notifyServer from './notifyServer.js';
import rsync from 'rsync';
import SimVersion from '../browser-and-node/SimVersion.js';
import winston from 'winston';
import { writePhetHtaccess } from './writePhetHtaccess.js';
import writePhetioHtaccess from '../common/writePhetioHtaccess.js';
import { deployImages } from './deployImages.js';
import * as persistentQueue from './persistentQueue.js';
import { sendEmail } from './sendEmail.js';
import { BuildServerTask } from './BuildServerTypes.js';
import { Checkout } from '../common/Checkout.js';

/**
 * Abort build with err - error logged and sent via email
 */
const abortBuild = async ( err: Error | string ): Promise<never> => {
  winston.log( 'error', `BUILD ABORTED! ${err}` );

  if ( err instanceof Error ) {
    err.stack && winston.log( 'error', err.stack );
  }

  throw new Error( `Build aborted, ${err}` );
};

/**
 * Clean up after deploy. Remove tmp dir.
 */
const afterDeploy = async ( buildDir: string ): Promise<void> => {
  try {
    await execute( 'rm', [ '-rf', buildDir ], '.' );
  }
  catch( err ) {
    await abortBuild( err instanceof Error ? err : new Error( `Error during afterDeploy: ${err}` ) );
  }
};

/**
 * taskQueue ensures that only one build/deploy process will be happening at the same time.  The main build/deploy logic is here.
 */
async function runTask( task: BuildServerTask ): Promise<void> {
  persistentQueue.startTask( task );

  if ( task.deployImages ) {
    try {
      await deployImages( task );
      return;
    }
    catch( e ) {
      winston.error( `${e}` );
      winston.error( 'Deploy images failed. See previous logs for details.' );
      throw e;
    }
  }

  try {
    try {
      validateBuildServerTask( task );
    }
    catch( e ) {
      await abortBuild( e instanceof Error ? e : new Error( `Error validating task: ${e}` ) );
    }

    const simName = task.simName;
    const version = task.version;
    const brands = task.brands;
    const legacyBranch = task.legacyBranch;

    if ( task.userId ) {
      winston.log( 'info', `setting userId = ${task.userId}` );
    }

    // validate simName
    const simNameRegex = /^[a-z-]+$/;
    if ( !simNameRegex.test( simName ) ) {
      await abortBuild( `invalid simName ${simName}` );
    }

    const releaseBranch = await Checkout.getReleaseBranch( simName, legacyBranch );
    await releaseBranch.checkout.updateWorktree();

    if ( task.totalitySHA !== await releaseBranch.checkout.getSHA() ) {
      await abortBuild( `totality SHA ${task.totalitySHA} does not match SHA of release branch ${await releaseBranch.checkout.getSHA()}` );
    }

    // Supported chipper versions
    const chipperVersion = await releaseBranch.checkout.getChipperVersion();
    winston.debug( `Chipper version detected: ${chipperVersion.toString()}` );
    if (
      !( chipperVersion.major === 3 && chipperVersion.minor === 0 ) &&
      !( chipperVersion.major === 2 && chipperVersion.minor === 0 ) &&
      !( chipperVersion.major === 0 && chipperVersion.minor === 0 )
    ) {
      await abortBuild( 'Unsupported chipper version' );
    }

    // sim package.json version vs. build request version check
    if ( chipperVersion.major !== 1 ) {
      const packageVersionString = ( await releaseBranch.getSimVersion() ).toString();
      if ( packageVersionString !== version ) {
        await abortBuild( `Version mismatch between package.json and build request: ${packageVersionString} vs ${version}` );
      }
    }

    // if this build request comes from rosetta it will have a userId field and only one locale
    const isTranslationRequest = task.userId && !task.locales.includes( ',' ) && !task.locales.includes( '*' );

    await releaseBranch.build( {
      clean: false,

      // We will build all locales for a translation request
      locales: isTranslationRequest ? '*' : task.locales,
      buildForServer: true,
      lint: false,
      allHTML: !( chipperVersion.major === 0 && chipperVersion.minor === 0 && brands[ 0 ] !== constants.PHET_BRAND )
    } );
    winston.debug( 'Build finished.' );

    winston.debug( `Deploying to servers: ${JSON.stringify( task.servers )}` );

    const buildDir = releaseBranch.getBuildDirectory();

    if ( task.servers.includes( constants.DEV_SERVER ) ) {
      winston.info( 'deploying to dev' );
      if ( brands.includes( constants.PHET_IO_BRAND ) ) {
        const htaccessLocation = ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) ?
                                 `${buildDir}/phet-io` :
                                 buildDir;
        await writePhetioHtaccess( simName, htaccessLocation, {
          checkoutDir: releaseBranch.checkout.workingDirectory,
          isProductionDeploy: false
        } );
      }
      await devDeploy( simName, version, chipperVersion, brands, buildDir );
    }

    if ( task.servers.includes( constants.PRODUCTION_SERVER ) ) {
      winston.info( 'deploying to production' );
      let targetVersionDir!: string;
      let targetSimDir!: string;

      // Loop over all brands
      for ( const brand of brands ) {
        winston.info( `deploying brand: ${brand}` );
        // Pre-copy steps
        if ( brand === constants.PHET_BRAND ) {
          targetSimDir = constants.HTML_SIMS_DIRECTORY + simName;
          targetVersionDir = `${targetSimDir}/${version}/`;

          if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
            // Remove _phet from all filenames in the phet directory
            const phetBuildDir = `${buildDir}/phet`;
            const files = fs.readdirSync( phetBuildDir );
            for ( const filename of files ) {
              if ( filename.includes( '_phet' ) ) {
                const newFilename = filename.replace( '_phet', '' );
                await execute( 'mv', [ filename, newFilename ], phetBuildDir );
              }
            }
          }
        }
        else if ( brand === constants.PHET_IO_BRAND ) {
          targetSimDir = constants.PHET_IO_SIMS_DIRECTORY + simName;
          targetVersionDir = `${targetSimDir}/${version}`;

          // Chipper 1.0 has -phetio in the version schema for PhET-iO branded sims
          if ( chipperVersion.major === 0 && !version.match( '-phetio' ) ) {
            targetVersionDir += '-phetio';
          }
          targetVersionDir += '/';
        }

        // Copy steps - allow EEXIST errors but reject anything else
        winston.debug( `Creating version dir: ${targetVersionDir}` );
        try {
          await fs.promises.mkdir( targetVersionDir, { recursive: true } );
          winston.debug( 'Success creating sim dir' );
        }
        catch( err ) {
          if ( ( err as { code: string } ).code !== 'EEXIST' ) {
            winston.error( 'Failure creating version dir' );
            winston.error( `${err}` );
            throw err;
          }
        }
        let sourceDir = buildDir;
        if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
          sourceDir += `/${brand}`;
        }
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        await new Promise<void>( ( resolve, reject ) => {
          winston.debug( `Copying recursive ${sourceDir} to ${targetVersionDir}` );
          new rsync()
            .flags( 'razpO' )
            .set( 'no-perms' )
            .set( 'exclude', '.rsync-filter' )
            .source( `${sourceDir}/` )
            .destination( targetVersionDir )
            .output( ( stdout: Buffer ) => { winston.debug( stdout.toString() ); },
              ( stderr: Buffer ) => { winston.error( stderr.toString() ); } )
            .execute( ( err: Error | null, code: number, cmd: string ) => {
              if ( err && code !== 23 ) {
                winston.debug( `${code}` );
                winston.debug( cmd );
                reject( err );
              }
              else { resolve(); }
            } );
        } );

        winston.debug( 'Copy finished' );

        // Post-copy steps
        if ( brand === constants.PHET_BRAND ) {
          if ( !isTranslationRequest ) {
            await deployImages( {
              simulation: task.simName,
              brands: task.brands,
              version: task.version
            } );
          }
          await writePhetHtaccess( simName, version );
          await createTranslationsXML( simName, version, releaseBranch.checkout.workingDirectory );

          // This should be the last function called for the phet brand.
          // This triggers an asyncronous task on the tomcat/wicket application and only waits for a response that the request was received.
          // Do not assume that this task is complete because we use await.
          await notifyServer( {
            simName: simName,
            email: task.email,
            brand: brand,
            locales: task.locales,
            translatorId: isTranslationRequest ? task.userId : undefined
          } );

          const latestFileSystemVersion = getLatestFileSystemProductionVersion( targetSimDir )!;

          // Production deploy to PhET Brand is most likely buggy if deploying a previous major.minor version. Let's
          // tell someone.
          if ( SimVersion.parse( version ).compareNumber( latestFileSystemVersion ) < 0 ) {
            await sendEmail( 'PhET Production Deploy of older release',
              `Build server deployed ${simName} version: ${version} to phet brand production site but the latest version is ${latestFileSystemVersion}` );
          }
        }
        else if ( brand === constants.PHET_IO_BRAND ) {
          const suffix = version.split( '-' ).length >= 2 ? version.split( '-' )[ 1 ] :
                         ( chipperVersion.major < 2 ? 'phetio' : '' );
          const parsedVersion = SimVersion.parse( version, '' );
          // TODO: replace with getWorktreePackageJSON https://github.com/phetsims/totality/issues/140
          const simPackage = await releaseBranch.getPackageJSON();
          const ignoreForAutomatedMaintenanceReleases = !!( simPackage && simPackage.phet && simPackage.phet.ignoreForAutomatedMaintenanceReleases );

          // This triggers an asyncronous task on the tomcat/wicket application and only waits for a response that the request was received.
          // Do not assume that this task is complete because we use await.
          await notifyServer( {
            simName: simName,
            email: task.email,
            brand: brand,
            phetioOptions: {
              legacyBranch: legacyBranch,
              suffix: suffix,
              version: parsedVersion,
              ignoreForAutomatedMaintenanceReleases: ignoreForAutomatedMaintenanceReleases
            }
          } );

          winston.debug( 'server notified' );
          await writePhetioHtaccess( simName, targetVersionDir, {
            version: version,
            directory: constants.PHET_IO_SIMS_DIRECTORY,
            checkoutDir: releaseBranch.checkout.workingDirectory,
            isProductionDeploy: true
          } );
        }
      }
    }
    await afterDeploy( `${buildDir}` );
  }
  catch( err ) {
    await abortBuild( err instanceof Error ? err : `${err}` );
  }
}

// Look at the file system for the directory that has the latest version as its name.
function getLatestFileSystemProductionVersion( dirPath: string ): SimVersion | undefined {
  const versionDirRegex = /^\d+\.\d+\.\d+$/; // start and end markers because we only care about production deploys
  const versionStrings = fs.readdirSync( dirPath ).filter( f => versionDirRegex.test( f ) );
  return versionStrings.map( f => SimVersion.parse( f ) ).sort( SimVersion.comparator ).pop();
}

export const taskWorker = (
  task: BuildServerTask,
  taskCallback: ( err?: Error | null ) => void
): void => {
  runTask( task )
    .then( () => {
        taskCallback();
      }
    ).catch( reason => {
    taskCallback( reason );
  } );
};

export const validateBuildServerTask = ( task: BuildServerTask ): void => {
  if ( task.api !== '3.0' ) {
    throw new Error( `Unsupported API version: ${task.api}` );
  }

  if ( typeof task.locales !== 'string' ) {
    throw new Error( `locales must be a string, got ${typeof task.locales}` );
  }

  if ( task.legacyBranch.includes( '/' ) ) {
    throw new Error( `legacyBranch should not include slashes, got ${task.legacyBranch}` );
  }
  if ( !task.legacyBranch.includes( '.' ) ) {
    throw new Error( `legacyBranch should include a dot, got ${task.legacyBranch}` );
  }

  if ( !task.totalitySHA || task.totalitySHA.length !== 40 ) {
    throw new Error( `totalitySHA should be a 40 character string, got ${task.totalitySHA}` );
  }

  if ( typeof task.version !== 'string' ) {
    throw new Error( `version must be a string, got ${typeof task.version}` );
  }

  if ( !Array.isArray( task.servers ) || task.servers.some( server => ![ 'dev', 'production' ].includes( server ) ) ) {
    throw new Error( `servers must be an array containing 'dev' and/or 'production', got ${JSON.stringify( task.servers )}` );
  }

  if ( !Array.isArray( task.brands ) || task.brands.some( brand => ![ constants.PHET_BRAND, constants.PHET_IO_BRAND ].includes( brand ) ) ) {
    throw new Error( `brands must be an array containing '${constants.PHET_BRAND}' and/or '${constants.PHET_IO_BRAND}', got ${JSON.stringify( task.brands )}` );
  }
};