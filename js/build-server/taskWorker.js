// Copyright 2017-2018, University of Colorado Boulder

'use strict';

const addTranslator = require( './addTranslator' );
const ChipperVersion = require( '../common/ChipperVersion' );
const constants = require( './constants' );
const createTranslationsXML = require( './createTranslationsXML' );
const devDeploy = require( './devDeploy' );
const execute = require( '../common/execute' );
const fs = require( 'graceful-fs' ); //eslint-disable-line
const getLocales = require( './getLocales' );
const notifyServer = require( './notifyServer' );
const pullMaster = require( './pullMaster' );
const rsync = require( 'rsync' );
const SimVersion = require( '../common/SimVersion' );
const winston = require( 'winston' );
const writeFile = require( '../common/writeFile' );
const writePhetHtaccess = require( './writePhetHtaccess' );
const writePhetioHtaccess = require( '../common/writePhetioHtaccess' );

const buildDir = './js/build-server/tmp';

/**
 * checkout master everywhere and abort build with err
 * @param {String|Error} err - error logged and sent via email
 */
const abortBuild = async err => {
  winston.log( 'error', 'BUILD ABORTED! ' + err );
  winston.log( 'info', 'build aborted: checking out master for every repo in case build shas are still checked out' );
  await execute( 'grunt', [ 'checkout-master-all' ], constants.PERENNIAL );
  return Promise.reject( 'Build aborted,' + err );
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
    return abortBuild( err );
  }
};

/**
 * taskQueue ensures that only one build/deploy process will be happening at the same time.  The main build/deploy logic is here.
 *
 * @param {Object}
 * @property {JSON} repos
 * @property {String} api
 * @property {String} locales - comma separated list of locale codes
 * @property {String} simName - lower case simulation name used for creating files/directories
 * @property {String} version - sim version identifier string
 * @property {String} servers - deployment targets, subset of [ 'dev', 'production' ]
 * @property {String} brands - deployment brands
 * @property {String} email - used for sending notifications about success/failure
 * @property {String} translatorId - rosetta user id for adding translators to the website
 * @property {String} res - express response object
 * @property {winston} winston - logger
 */
async function taskWorker( { api, repos, locales, simName, version, email, brands, servers, userId, branch } ) {
  try {
    //-------------------------------------------------------------------------------------
    // Parse and validate parameters
    //-------------------------------------------------------------------------------------
    if ( userId ) {
      winston.log( 'info', 'setting userId = ' + userId );
    }

    const simNameRegex = /^[a-z-]+$/;

    winston.debug( JSON.stringify( repos ) );

    if ( branch === null ) {
      branch = repos[ simName ].branch;
    }

    // make sure the repos passed in validates
    for ( const key in repos ) {
      if ( repos.hasOwnProperty( key ) ) {
        winston.log( 'info', 'Validating repo: ' + key );

        // make sure all keys in repos object are valid sim names
        if ( !simNameRegex.test( key ) ) {
          return abortBuild( 'invalid simName in repos: ' + simName );
        }

        const value = repos[ key ];
        if ( key === 'comment' ) {
          if ( typeof value !== 'string' ) {
            return abortBuild( 'invalid comment in repos: should be a string' );
          }
        }
        else if ( value instanceof Object && value.hasOwnProperty( 'sha' ) ) {
          if ( !/^[a-f0-9]{40}$/.test( value.sha ) ) {
            return abortBuild( 'invalid sha in repos. key: ' + key + ' value: ' + value + ' sha: ' + value.sha );
          }
        }
        else {
          return abortBuild( 'invalid item in repos. key: ' + key + ' value: ' + value );
        }
      }
    }

    // validate simName
    if ( !simNameRegex.test( simName ) ) {
      return abortBuild( 'invalid simName ' + simName );
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
        winston.log( 'info', 'detecting version number: ' + version );
      }
      else {
        return abortBuild( 'invalid version number: ' + version );
      }
    }

    const simDir = '../' + simName;
    winston.log( 'info', 'building sim ' + simName );

    // Create the temporary build dir, removing the existing dir if it exists.
    await new Promise( ( resolve, reject ) => {
      fs.mkdir( buildDir, async err => {
        // If there is an error, try to remove the directory and contents and try again
        if ( err ) {
          try {
            await execute( 'rm', [ '-rf', buildDir ], '.' );
          }
          catch( e ) {
            reject( e );
          }
          fs.mkdir( buildDir, err => {
            if ( err ) {
              winston.error( 'Error creating new build dir: ' );
              winston.error( err );
              reject( err );
            }
            else {
              winston.info( 'successfully created build dir' );
              resolve();
            }
          } );

        }
        else {
          winston.info( 'successfully created build dir' );
          resolve();
        }
      } );
    } );

    await writeFile( buildDir + '/dependencies.json', JSON.stringify( repos ) );
    winston.log( 'info', 'wrote file ' + buildDir + '/dependencies.json' );

    await execute( 'git', [ 'pull' ], constants.PERENNIAL );
    await execute( 'npm', [ 'prune' ], constants.PERENNIAL );
    await execute( 'npm', [ 'update' ], constants.PERENNIAL );
    await execute( './perennial/bin/clone-missing-repos.sh', [], '..' );
    await pullMaster( repos );
    await execute( 'grunt', [ 'checkout-shas', '--buildServer=true', '--repo=' + simName ], constants.PERENNIAL );
    await execute( 'git', [ 'checkout', repos[ simName ].sha ], simDir );
    await execute( 'npm', [ 'prune' ], '../chipper' );
    await execute( 'npm', [ 'update' ], '../chipper' );
    await execute( 'npm', [ 'prune' ], simDir );
    await execute( 'npm', [ 'update' ], simDir );

    if ( api === '1.0' ) {
      locales = await getLocales( locales, simName );
    }

    const brandLocales = ( brands.indexOf( constants.PHET_BRAND ) >= 0 ) ? locales : 'en';
    winston.log( 'info', 'building for brands: ' + brands + ' version: ' + version );

    const chipperVersion = ChipperVersion.getFromRepository();
    winston.debug( 'Chipper version detected: ' + chipperVersion.toString() );

    if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
      await execute( 'grunt', [ '--allHTML', '--debugHTML', '--brands=' + brands.join( ',' ), '--locales=' + brandLocales ], simDir );
    }
    else if ( chipperVersion.major === 0 && chipperVersion.minor === 0 ) {
      const args = [ 'build-for-server', '--brand=' + brands[ 0 ], '--locales=' + brandLocales ];
      if ( brands[ 0 ] === constants.PHET_BRAND ) {
        args.push( '--allHTML' );
      }
      await execute( 'grunt', args, simDir );
    }
    else {
      return abortBuild( 'Unsupported chipper version' );
    }

    winston.debug( 'deploying to servers: ' + JSON.stringify( servers ) );

    if ( servers.indexOf( constants.DEV_SERVER ) >= 0 ) {
      winston.info( 'deploying to dev' );
      if ( brands.indexOf( constants.PHET_IO_BRAND ) >= 0 ) {
        const htaccessLocation = ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) ?
                                 simDir + '/build/phet-io' :
                                 simDir + '/build';
        await writePhetioHtaccess( htaccessLocation );
      }
      await devDeploy( simDir, simName, version, chipperVersion, brands );
    }

    if ( servers.indexOf( constants.PRODUCTION_SERVER ) >= 0 ) {
      winston.info( 'deploying to production' );
      let targetVersionDir;
      let targetSimDir;
      // Loop over all brands
      for ( const i in brands ) {
        if ( brands.hasOwnProperty( i ) ) {
          const brand = brands[ i ];
          winston.info( 'deploying brand: ' + brand );

          // Pre-copy steps
          if ( brand === constants.PHET_BRAND ) {
            targetSimDir = constants.HTML_SIMS_DIRECTORY + simName;
            targetVersionDir = targetSimDir + '/' + version + '/';

            if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
              // Remove _phet from all filenames in the phet directory
              const files = fs.readdirSync( simDir + '/build/phet' );
              for ( const i in files ) {
                if ( files.hasOwnProperty( i ) ) {
                  const filename = files[ i ];
                  if ( filename.indexOf( '_phet' ) >= 0 ) {
                    const newFilename = filename.replace( '_phet', '' );
                    await execute( 'mv', [ filename, newFilename ], simDir + '/build/phet' );
                  }
                }
              }
            }
          }
          else if ( brand === constants.PHET_IO_BRAND ) {
            targetSimDir = constants.PHET_IO_SIMS_DIRECTORY + simName;
            targetVersionDir = targetSimDir + '/' + originalVersion;
            if ( chipperVersion.major === 0 && !originalVersion.match( '-phetio' ) ) {
              targetVersionDir += '-phetio';
            }
            targetVersionDir += '/';
          }

          // Copy steps - allow EEXIST errors but reject anything else
          await new Promise( async ( resolve, reject ) => {
            // If this is a deploy of 1.0.0, create the sim directory
            if ( !fs.existsSync( targetSimDir ) ) {
              winston.debug( 'Creating sim dir: ' + targetSimDir );
              try {
                await new Promise( ( resolve, reject ) => {
                  fs.mkdir( targetSimDir, err => {
                    if ( err && err.code !== 'EEXIST' ) {
                      winston.debug( 'Failure creating sim dir' );
                      reject( err );
                    }
                    winston.debug( 'Success creating sim dir' );
                    resolve();
                  } );
                } );
              }
              catch( e ) {
                reject( e );
              }
            }
            // Create the version directory
            winston.debug( 'Creating version dir: ' + targetVersionDir );
            fs.mkdir( targetVersionDir, err => {
              if ( err && err.code !== 'EEXIST' ) {
                winston.debug( 'Failure creating version dir' );
                reject( err );
              }
              winston.debug( 'Success creating sim dir' );
              resolve();
            } );
          } );
          let sourceDir = simDir + '/build';
          if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
            sourceDir += '/' + brand;
          }
          await new Promise( ( resolve, reject ) => {
            winston.debug( 'Copying recursive ' + sourceDir + ' to ' + targetVersionDir );
            new rsync()
              .flags( 'razpO' )
              .set( 'no-perms' )
              .set( 'exclude', '.rsync-filter' )
              .source( sourceDir + '/' )
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
            await notifyServer( simName, email, brand );

            // if this build request comes from rosetta it will have a userId field and only one locale
            const localesArray = typeof( locales ) === 'string' ? locales.split( ',' ) : locales;
            if ( userId && localesArray.length === 1 && localesArray[ 0 ] !== '*' ) {
              await addTranslator( localesArray[ 0 ], simName, userId );
            }
          }
          else if ( brand === constants.PHET_IO_BRAND ) {
            const suffix = originalVersion.split( '-' ).length >= 2 ? originalVersion.split( '-' )[ 1 ] : ( chipperVersion.major < 2 ? 'phetio' : '' );
            await notifyServer( simName, email, brand, { branch: branch, suffix: suffix, version: SimVersion.parse( version, '' ) } );
            winston.debug( 'server notified' );
            await writePhetioHtaccess(
              targetVersionDir,
              { simName: simName, version: originalVersion, directory: constants.PHET_IO_SIMS_DIRECTORY }
            );
            winston.debug( 'phetio htaccess written' );
          }
        }
      }
    }
  }
  catch( err ) {
    return abortBuild( err );
  }
  return afterDeploy();
}

module.exports = ( task, taskCallback ) => {
  taskWorker( task )
    .then( () => {
        taskCallback();
      }
    ).catch( ( reason ) => {
    taskCallback( reason );
  } );
};