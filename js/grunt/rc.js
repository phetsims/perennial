// Copyright 2017, University of Colorado Boulder

/**
 * Deploys an rc version after incrementing the test version number.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line
const booleanPrompt = require( '../common/booleanPrompt' );
const build = require( '../common/build' );
const buildLocal = require( '../common/buildLocal' );
const buildServerRequest = require( '../common/buildServerRequest' );
const checkoutMaster = require( '../common/checkoutMaster' );
const checkoutTarget = require( '../common/checkoutTarget' );
const createRelease = require( './createRelease' );
const devAccessAvailable = require( '../common/devAccessAvailable' );
const devDirectoryExists = require( '../common/devDirectoryExists' );
const getDependencies = require( '../common/getDependencies' );
const getRepoVersion = require( '../common/getRepoVersion' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const grunt = require( 'grunt' );
const hasRemoteBranch = require( '../common/hasRemoteBranch' );
const npmUpdate = require( '../common/npmUpdate' );
const setRepoVersion = require( '../common/setRepoVersion' );
const SimVersion = require( '../common/SimVersion' );
const updateDependenciesJSON = require( '../common/updateDependenciesJSON' );

/**
 * Deploys an rc version after incrementing the test version number.
 * @public
 *
 * @param {string} repo
 * @param {string} branch
 * @param {Array.<string>} brands
 * @param {boolean} noninteractive
 * @param {string} [message] - Optional message to append to the version-increment commit.
 * @returns {Promise.<SimVersion>}
 */
module.exports = async function( repo, branch, brands, noninteractive, message ) {
  SimVersion.ensureReleaseBranch( branch );

  if ( !( await devAccessAvailable() ) ) {
    grunt.fail.fatal( 'Could not access SSH to the dev server. Do you have VPN on and have the correct credentials?' );
  }

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot create release branch` );
  }

  if ( !( await hasRemoteBranch( repo, branch ) ) ) {
    if ( noninteractive || !await booleanPrompt( `Release branch ${branch} does not exist. Create it?`, false ) ) {
      throw new Error( 'Aborted rc deployment due to non-existing branch' );
    }

    await createRelease( repo, branch );
  }

  await checkoutTarget( repo, branch, true ); // include npm update

  try {
    const previousVersion = await getRepoVersion( repo );

    if ( previousVersion.testType !== 'rc' && previousVersion.testType !== null ) {
      throw new Error( `Aborted rc deployment since the version number cannot be incremented safely (testType:${previousVersion.testType})` );
    }

    const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance + ( previousVersion.testType === null ? 1 : 0 ), {
      testType: 'rc',
      testNumber: previousVersion.testNumber ? previousVersion.testNumber + 1 : 1
    } );

    const versionString = version.toString();
    const simPath = buildLocal.devDeployPath + repo;
    const versionPath = simPath + '/' + versionString;

    const versionPathExists = await devDirectoryExists( versionPath );

    if ( versionPathExists ) {
      throw new Error( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
    }

    if ( !await booleanPrompt( `Deploy ${versionString} to ${buildLocal.devDeployServer}`, noninteractive ) ) {
      throw new Error( 'Aborted rc deployment' );
    }

    await setRepoVersion( repo, version, message );
    await gitPush( repo, branch );

    // Make sure our correct npm dependencies are set
    await npmUpdate( repo );
    await npmUpdate( 'chipper' );

    // No special options required here, as we send the main request to the build server
    grunt.log.writeln( await build( repo, {
      brands
    } ) );

    if ( !await booleanPrompt( `Please test the built version of ${repo}.\nIs it ready to deploy`, noninteractive ) ) {
      // Abort version update
      await setRepoVersion( repo, previousVersion, message );
      await gitPush( repo, branch );

      // Abort checkout
      await checkoutMaster( repo, true );
      throw new Error( 'Aborted rc deployment (aborted version change too).' );
    }

    // Move over dependencies.json and commit/push
    await updateDependenciesJSON( repo, brands, versionString, branch );

    // Send the build request
    await buildServerRequest( repo, version, await getDependencies( repo ), {
      locales: [ 'en' ],
      brands,
      servers: [ 'dev' ]
    } );

    // Move back to master
    await checkoutMaster( repo, true );

    const versionURL = `https://phet-dev.colorado.edu/html/${repo}/${versionString}`;

    if ( brands.includes( 'phet' ) ) {
      grunt.log.writeln( `Deployed: ${versionURL}/phet/${repo}_en_phet.html` );
    }
    if ( brands.includes( 'phet-io' ) ) {
      grunt.log.writeln( `Deployed: ${versionURL}/phet-io/wrappers/index` );
    }

    grunt.log.writeln( 'Please wait for the build-server to complete the deployment, and then test!' );

    return version;
  }
  catch ( e ) {
    grunt.log.warn( 'Detected failure during deploy, reverting to master' );
    await checkoutMaster( repo, true );
    throw e;
  }
};
