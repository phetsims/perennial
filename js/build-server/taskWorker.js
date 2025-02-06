// Copyright 2017-2019, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)


const constants = require( './constants' );
const createTranslationsXML = require( './createTranslationsXML' );
const devDeploy = require( './devDeploy' );
const execute = require( '../common/execute' ).default;
const fs = require( 'fs' );
const getLocales = require( './getLocales' );
const notifyServer = require( './notifyServer' );
const rsync = require( 'rsync' );
const SimVersion = require( '../browser-and-node/SimVersion' ).default;
const winston = require( 'winston' );
const writePhetHtaccess = require( './writePhetHtaccess' );
const writePhetioHtaccess = require( '../common/writePhetioHtaccess' ).default;
const deployImages = require( './deployImages' );
const persistentQueue = require( './persistentQueue' );
const ReleaseBranch = require( '../common/ReleaseBranch' ).default;
const loadJSON = require( '../common/loadJSON' );
const sendEmail = require( './sendEmail' );

/**
 * Abort build with err
 * @param {String|Error} err - error logged and sent via email
 */
const abortBuild = async err => {
  winston.log( 'error', `BUILD ABORTED! ${err}` );
  err.stack && winston.log( 'error', err.stack );

  throw new Error( `Build aborted, ${err}` );
};

/**
 * Clean up after deploy. Remove tmp dir.
 */
const afterDeploy = async buildDir => {
  try {
    await execute( 'rm', [ '-rf', buildDir ], '.' );
  }
  catch( err ) {
    await abortBuild( err );
  }
};

/**
 * taskQueue ensures that only one build/deploy process will be happening at the same time.  The main build/deploy logic is here.
 *
 * @property {JSON} repos
 * @property {String} api
 * @property {String} locales - comma separated list of locale codes
 * @property {String} simName - lower case simulation name used for creating files/directories
 * @property {String} version - sim version identifier string
 * @property {String} servers - deployment targets, subset of [ 'dev', 'production' ]
 * @property {string[]} brands - deployment brands
 * @property {String} email - used for sending notifications about success/failure
 * @property {String} translatorId - rosetta user id for adding translators to the website
 * @property {winston} winston - logger
 * @param options
 */
async function runTask( options ) {
  persistentQueue.startTask( options );
  if ( options.deployImages ) {
    try {
      await deployImages( options );
      return;
    }
    catch( e ) {
      winston.error( e );
      winston.error( 'Deploy images failed. See previous logs for details.' );
      throw e;
    }
  }


  try {
    //-------------------------------------------------------------------------------------
    // Parse and validate parameters
    //-------------------------------------------------------------------------------------
    const api = options.api;
    const dependencies = options.repos;
    let locales = options.locales;
    const simName = options.simName;
    let version = options.version;
    const email = options.email;
    const brands = options.brands;
    const servers = options.servers;
    const userId = options.userId;
    const branch = options.branch || version.match( /^(\d+\.\d+)/ )[ 0 ];

    if ( userId ) {
      winston.log( 'info', `setting userId = ${userId}` );
    }

    if ( branch === null ) {
      await abortBuild( 'Branch must be provided.' );
    }

    // validate simName
    const simNameRegex = /^[a-z-]+$/;
    if ( !simNameRegex.test( simName ) ) {
      await abortBuild( `invalid simName ${simName}` );
    }

    // make sure the repos passed in validates
    for ( const key in dependencies ) {
      if ( dependencies.hasOwnProperty( key ) ) {
        winston.log( 'info', `Validating repo: ${key}` );

        // make sure all keys in dependencies object are valid sim names
        if ( !simNameRegex.test( key ) ) {
          await abortBuild( `invalid simName in dependencies: ${simName}` );
        }

        const value = dependencies[ key ];
        if ( key === 'comment' ) {
          if ( typeof value !== 'string' ) {
            await abortBuild( 'invalid comment in dependencies: should be a string' );
          }
        }
        else if ( value instanceof Object && value.hasOwnProperty( 'sha' ) ) {
          if ( !/^[a-f0-9]{40}$/.test( value.sha ) ) {
            await abortBuild( `invalid sha in dependencies. key: ${key} value: ${value} sha: ${value.sha}` );
          }
        }
        else {
          await abortBuild( `invalid item in dependencies. key: ${key} value: ${value}` );
        }
      }
    }

    // Infer brand from version string and keep unstripped version for phet-io
    const originalVersion = version;
    if ( api === '1.0' ) {
      // validate version and strip suffixes since just the numbers are used in the directory name on dev and production servers
      const versionMatch = version.match( /^(\d+\.\d+\.\d+)(?:-.*)?$/ );
      if ( versionMatch && versionMatch.length === 2 ) {

        if ( servers.includes( 'dev' ) ) {
          // if deploying an rc version use the -rc.[number] suffix
          version = versionMatch[ 0 ];
        }
        else {
          // otherwise strip any suffix
          version = versionMatch[ 1 ];
        }
        winston.log( 'info', `detecting version number: ${version}` );
      }
      else {
        await abortBuild( `invalid version number: ${version}` );
      }
    }

    if ( api === '1.0' ) {
      locales = await getLocales( locales, simName );
    }

    // Git pull, git checkout, npm prune & update, etc. in parallel directory
    const releaseBranch = new ReleaseBranch( simName, branch, brands, true );
    await releaseBranch.updateCheckout( dependencies );

    const chipperVersion = releaseBranch.getChipperVersion();
    winston.debug( `Chipper version detected: ${chipperVersion.toString()}` );
    if ( !( chipperVersion.major === 2 && chipperVersion.minor === 0 ) && !( chipperVersion.major === 0 && chipperVersion.minor === 0 ) ) {
      await abortBuild( 'Unsupported chipper version' );
    }

    if ( chipperVersion.major !== 1 ) {
      const checkoutDirectory = ReleaseBranch.getCheckoutDirectory( simName, branch );
      const packageJSON = JSON.parse( fs.readFileSync( `${checkoutDirectory}/${simName}/package.json`, 'utf8' ) );
      const packageVersion = packageJSON.version;

      if ( packageVersion !== version ) {
        await abortBuild( `Version mismatch between package.json and build request: ${packageVersion} vs ${version}` );
      }
    }

    const localesArray = typeof ( locales ) === 'string' ? locales.split( ',' ) : locales;
    // if this build request comes from rosetta it will have a userId field and only one locale
    const isTranslationRequest = userId && localesArray.length === 1 && localesArray[ 0 ] !== '*';

    await releaseBranch.build( {
      clean: false,
      locales: isTranslationRequest ? '*' : locales,
      buildForServer: true,
      lint: false,
      allHTML: !( chipperVersion.major === 0 && chipperVersion.minor === 0 && brands[ 0 ] !== constants.PHET_BRAND )
    } );
    winston.debug( 'Build finished.' );

    winston.debug( `Deploying to servers: ${JSON.stringify( servers )}` );

    const checkoutDir = ReleaseBranch.getCheckoutDirectory( simName, branch );
    const simRepoDir = `${checkoutDir}/${simName}`;
    const buildDir = `${simRepoDir}/build`;

    if ( servers.indexOf( constants.DEV_SERVER ) >= 0 ) {
      winston.info( 'deploying to dev' );
      if ( brands.indexOf( constants.PHET_IO_BRAND ) >= 0 ) {
        const htaccessLocation = ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) ?
                                 `${buildDir}/phet-io` :
                                 buildDir;
        await writePhetioHtaccess( simName, htaccessLocation, {
          checkoutDir: checkoutDir,
          isProductionDeploy: false
        } );
      }
      await devDeploy( checkoutDir, simName, version, chipperVersion, brands, buildDir );
    }

    if ( servers.indexOf( constants.PRODUCTION_SERVER ) >= 0 ) {
      winston.info( 'deploying to production' );
      let targetVersionDir;
      let targetSimDir;

      // Loop over all brands
      for ( const i in brands ) {
        if ( brands.hasOwnProperty( i ) ) {
          const brand = brands[ i ];
          winston.info( `deploying brand: ${brand}` );
          // Pre-copy steps
          if ( brand === constants.PHET_BRAND ) {
            targetSimDir = constants.HTML_SIMS_DIRECTORY + simName;
            targetVersionDir = `${targetSimDir}/${version}/`;

            if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
              // Remove _phet from all filenames in the phet directory
              const phetBuildDir = `${buildDir}/phet`;
              const files = fs.readdirSync( phetBuildDir );
              for ( const i in files ) {
                if ( files.hasOwnProperty( i ) ) {
                  const filename = files[ i ];
                  if ( filename.indexOf( '_phet' ) >= 0 ) {
                    const newFilename = filename.replace( '_phet', '' );
                    await execute( 'mv', [ filename, newFilename ], phetBuildDir );
                  }
                }
              }
            }
          }
          else if ( brand === constants.PHET_IO_BRAND ) {
            targetSimDir = constants.PHET_IO_SIMS_DIRECTORY + simName;
            targetVersionDir = `${targetSimDir}/${originalVersion}`;

            // Chipper 1.0 has -phetio in the version schema for PhET-iO branded sims
            if ( chipperVersion.major === 0 && !originalVersion.match( '-phetio' ) ) {
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
            if ( err.code !== 'EEXIST' ) {
              winston.error( 'Failure creating version dir' );
              winston.error( err );
              throw err;
            }
          }
          let sourceDir = buildDir;
          if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
            sourceDir += `/${brand}`;
          }
          await new Promise( ( resolve, reject ) => {
            winston.debug( `Copying recursive ${sourceDir} to ${targetVersionDir}` );
            new rsync()
              .flags( 'razpO' )
              .set( 'no-perms' )
              .set( 'exclude', '.rsync-filter' )
              .source( `${sourceDir}/` )
              .destination( targetVersionDir )
              .output( stdout => { winston.debug( stdout.toString() ); },
                stderr => { winston.error( stderr.toString() ); } )
              .execute( ( err, code, cmd ) => {
                if ( err && code !== 23 ) {
                  winston.debug( code );
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
                simulation: options.simName,
                brands: options.brands,
                version: options.version
              } );
            }
            await writePhetHtaccess( simName, version );
            await createTranslationsXML( simName, version, checkoutDir );

            // This should be the last function called for the phet brand.
            // This triggers an asyncronous task on the tomcat/wicket application and only waits for a response that the request was received.
            // Do not assume that this task is complete because we use await.
            await notifyServer( {
              simName: simName,
              email: email,
              brand: brand,
              locales: locales,
              translatorId: isTranslationRequest ? userId : undefined
            } );

            const latestFileSystemVersion = getLatestFileSystemProductionVersion( targetSimDir );

            // Production deploy to PhET Brand is most likely buggy if deploying a previous major.minor version. Let's
            // tell someone.
            if ( SimVersion.parse( version ).compareNumber( latestFileSystemVersion ) < 0 ) {
              sendEmail( 'PhET Production Deploy of older release',
                `Build server deployed ${simName} version: ${version} to phet brand production site but the latest version is ${latestFileSystemVersion}` );
            }
          }
          else if ( brand === constants.PHET_IO_BRAND ) {
            const suffix = originalVersion.split( '-' ).length >= 2 ? originalVersion.split( '-' )[ 1 ] :
                           ( chipperVersion.major < 2 ? 'phetio' : '' );
            const parsedVersion = SimVersion.parse( version, '' );
            const simPackage = await loadJSON( `${simRepoDir}/package.json` );
            const ignoreForAutomatedMaintenanceReleases = !!( simPackage && simPackage.phet && simPackage.phet.ignoreForAutomatedMaintenanceReleases );

            // This triggers an asyncronous task on the tomcat/wicket application and only waits for a response that the request was received.
            // Do not assume that this task is complete because we use await.
            await notifyServer( {
              simName: simName,
              email: email,
              brand: brand,
              phetioOptions: {
                branch: branch,
                suffix: suffix,
                version: parsedVersion,
                ignoreForAutomatedMaintenanceReleases: ignoreForAutomatedMaintenanceReleases
              }
            } );

            winston.debug( 'server notified' );
            await writePhetioHtaccess( simName, targetVersionDir, {
              version: originalVersion,
              directory: constants.PHET_IO_SIMS_DIRECTORY,
              checkoutDir: checkoutDir,
              isProductionDeploy: true
            } );
          }
        }
      }
    }
    await afterDeploy( `${buildDir}` );
  }
  catch( err ) {
    await abortBuild( err );
  }
}

// Look at the file system for the directory that has the latest version as its name.
function getLatestFileSystemProductionVersion( dirPath ) {
  const versionDirRegex = /^\d+\.\d+\.\d+$/; // start and end markers because we only care about production deploys
  const versionStrings = fs.readdirSync( dirPath ).filter( f => versionDirRegex.test( f ) );
  return versionStrings.map( f => SimVersion.parse( f ) ).sort( SimVersion.comparator ).pop();
}


module.exports = function taskWorker( task, taskCallback ) {
  runTask( task )
    .then( () => {
        taskCallback();
      }
    ).catch( reason => {
    taskCallback( reason );
  } );
};