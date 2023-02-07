// Copyright 2017-2019, University of Colorado Boulder


const ChipperVersion = require( '../common/ChipperVersion' );
const constants = require( './constants' );
const createTranslationsXML = require( './createTranslationsXML' );
const devDeploy = require( './devDeploy' );
const execute = require( '../common/execute' );
const fs = require( 'fs' );
const gitCheckout = require( '../common/gitCheckout' );
const gitPull = require( '../common/gitPull' );
const getLocales = require( './getLocales' );
const notifyServer = require( './notifyServer' );
const pullMaster = require( './pullMaster' );
const rsync = require( 'rsync' );
const SimVersion = require( '../common/SimVersion' );
const winston = require( 'winston' );
const writeFile = require( '../common/writeFile' );
const writePhetHtaccess = require( './writePhetHtaccess' );
const writePhetioHtaccess = require( '../common/writePhetioHtaccess' );
const deployImages = require( './deployImages' );
const persistentQueue = require( './persistentQueue' );

const buildDir = './js/build-server/tmp';

/**
 * checkout master everywhere and abort build with err
 * @param {String|Error} err - error logged and sent via email
 */
const abortBuild = async err => {
  winston.log( 'error', `BUILD ABORTED! ${err}` );
  err.stack && winston.log( 'error', err.stack );

  winston.log( 'info', 'build aborted: checking out master for every repo in case build shas are still checked out' );
  await execute( 'grunt', [ 'checkout-master-all' ], constants.PERENNIAL );
  throw new Error( `Build aborted, ${err}` );
};

/**
 * Clean up after deploy. Checkout master for every repo and remove tmp dir.
 */
const afterDeploy = async buildDir => {
  try {
    await execute( 'grunt', [ 'checkout-master-all' ], constants.PERENNIAL );
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
  persistentQueue.removeTask( options );
  if ( options.deployImages ) {
    try {
      await deployImages( options );
      await gitCheckout( 'chipper', 'master' );
      await gitPull( 'chipper' );
      await gitCheckout( 'perennial-alias', 'master' );
      await gitPull( 'perennial-alias' );
      winston.info( 'Deploy images completed successfully.' );
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
    const repos = options.repos;
    let locales = options.locales;
    const simName = options.simName;
    let version = options.version;
    const email = options.email;
    const brands = options.brands;
    const servers = options.servers;
    const userId = options.userId;
    let branch = options.branch;

    if ( userId ) {
      winston.log( 'info', `setting userId = ${userId}` );
    }

    const simNameRegex = /^[a-z-]+$/;

    winston.debug( JSON.stringify( repos ) );

    if ( branch === null ) {
      branch = repos[ simName ].branch;
    }

    // make sure the repos passed in validates
    for ( const key in repos ) {
      if ( repos.hasOwnProperty( key ) ) {
        winston.log( 'info', `Validating repo: ${key}` );

        // make sure all keys in repos object are valid sim names
        if ( !simNameRegex.test( key ) ) {
          await abortBuild( `invalid simName in repos: ${simName}` );
        }

        const value = repos[ key ];
        if ( key === 'comment' ) {
          if ( typeof value !== 'string' ) {
            await abortBuild( 'invalid comment in repos: should be a string' );
          }
        }
        else if ( value instanceof Object && value.hasOwnProperty( 'sha' ) ) {
          if ( !/^[a-f0-9]{40}$/.test( value.sha ) ) {
            await abortBuild( `invalid sha in repos. key: ${key} value: ${value} sha: ${value.sha}` );
          }
        }
        else {
          await abortBuild( `invalid item in repos. key: ${key} value: ${value}` );
        }
      }
    }

    // validate simName
    if ( !simNameRegex.test( simName ) ) {
      await abortBuild( `invalid simName ${simName}` );
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

    const simDir = `../${simName}`;
    winston.log( 'info', `building sim ${simName}` );

    // Create the temporary build dir, removing the existing dir if it exists.
    if ( fs.existsSync( buildDir ) ) {
      await execute( 'rm', [ '-rf', buildDir ], '.' );
    }
    await fs.promises.mkdir( buildDir, { recursive: true } );


    await writeFile( `${buildDir}/dependencies.json`, JSON.stringify( repos ) );
    winston.log( 'info', `wrote file ${buildDir}/dependencies.json` );

    await execute( 'git', [ 'pull' ], constants.PERENNIAL );
    await execute( 'npm', [ 'prune' ], constants.PERENNIAL );
    await execute( 'npm', [ 'update' ], constants.PERENNIAL );
    await execute( './perennial/bin/clone-missing-repos.sh', [], '..' );
    await pullMaster( repos );
    await execute( 'grunt', [ 'checkout-shas', '--buildServer=true', `--repo=${simName}` ], constants.PERENNIAL );
    await execute( 'git', [ 'checkout', repos[ simName ].sha ], simDir );
    await execute( 'npm', [ 'prune' ], '../chipper' );
    await execute( 'npm', [ 'update' ], '../chipper' );
    await execute( 'npm', [ 'prune' ], '../perennial-alias' );
    await execute( 'npm', [ 'update' ], '../perennial-alias' );
    await execute( 'npm', [ 'prune' ], simDir );
    await execute( 'npm', [ 'update' ], simDir );

    if ( api === '1.0' ) {
      locales = await getLocales( locales, simName );
    }

    const brandLocales = ( brands.indexOf( constants.PHET_BRAND ) >= 0 ) ? locales : 'en';
    winston.log( 'info', `building for brands: ${brands} version: ${version}` );

    const chipperVersion = ChipperVersion.getFromRepository();
    winston.debug( `Chipper version detected: ${chipperVersion.toString()}` );

    if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
      await execute( 'grunt', [ '--allHTML', '--debugHTML', `--brands=${brands.join( ',' )}`, `--locales=${brandLocales}` ], simDir );
    }
    else if ( chipperVersion.major === 0 && chipperVersion.minor === 0 ) {
      const args = [ 'build-for-server', `--brand=${brands[ 0 ]}`, `--locales=${brandLocales}` ];
      if ( brands[ 0 ] === constants.PHET_BRAND ) {
        args.push( '--allHTML' );
      }
      await execute( 'grunt', args, simDir );
    }
    else {
      await abortBuild( 'Unsupported chipper version' );
    }

    winston.debug( `deploying to servers: ${JSON.stringify( servers )}` );

    if ( servers.indexOf( constants.DEV_SERVER ) >= 0 ) {
      winston.info( 'deploying to dev' );
      if ( brands.indexOf( constants.PHET_IO_BRAND ) >= 0 ) {
        const htaccessLocation = ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) ?
                                 `${simDir}/build/phet-io` :
                                 `${simDir}/build`;
        await writePhetioHtaccess( htaccessLocation );
      }
      await devDeploy( simDir, simName, version, chipperVersion, brands );
    }

    const localesArray = typeof ( locales ) === 'string' ? locales.split( ',' ) : locales;

    // if this build request comes from rosetta it will have a userId field and only one locale
    const isTranslationRequest = userId && localesArray.length === 1 && localesArray[ 0 ] !== '*';

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
              const files = fs.readdirSync( `${simDir}/build/phet` );
              for ( const i in files ) {
                if ( files.hasOwnProperty( i ) ) {
                  const filename = files[ i ];
                  if ( filename.indexOf( '_phet' ) >= 0 ) {
                    const newFilename = filename.replace( '_phet', '' );
                    await execute( 'mv', [ filename, newFilename ], `${simDir}/build/phet` );
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

          let sourceDir = `${simDir}/build`;
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
            await writePhetHtaccess( simName, version );
            await createTranslationsXML( simName, version );
            await notifyServer( {
              simName: simName,
              email: email,
              brand: brand,
              locales: locales,
              translatorId: isTranslationRequest ? userId : undefined
            } );
          }
          else if ( brand === constants.PHET_IO_BRAND ) {
            const suffix = originalVersion.split( '-' ).length >= 2 ? originalVersion.split( '-' )[ 1 ] :
                           ( chipperVersion.major < 2 ? 'phetio' : '' );
            const parsedVersion = SimVersion.parse( version, '' );
            const simPackage = JSON.parse( fs.readFileSync( `${simDir}/package.json` ) );
            const ignoreForAutomatedMaintenanceReleases = !!( simPackage && simPackage.phet && simPackage.phet.ignoreForAutomatedMaintenanceReleases );
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
            await writePhetioHtaccess( targetVersionDir, {
              simName: simName,
              version: originalVersion,
              directory: constants.PHET_IO_SIMS_DIRECTORY
            } );
          }
        }
      }

      if ( !isTranslationRequest ) {
        await deployImages( {
          branch: 'master', // chipper branch, always deploy images from master
          simulation: options.simName,
          brands: options.brands,
          version: options.version
        } );
      }
    }
  }
  catch( err ) {
    await abortBuild( err );
  }

  await afterDeploy();
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