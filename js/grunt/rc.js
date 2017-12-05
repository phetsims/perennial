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
const assert = require( 'assert' );
const build = require( '../common/build' );
const buildLocal = require( '../common/buildLocal' );
const buildServerRequest = require( '../common/buildServerRequest' );
const checkoutMaster = require( '../common/checkoutMaster' );
const checkoutTarget = require( '../common/checkoutTarget' );
const createRelease = require( './createRelease' );
const devDirectoryExists = require( '../common/devDirectoryExists' );
const getDependencies = require( '../common/getDependencies' );
const getRepoVersion = require( '../common/getRepoVersion' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const hasRemoteBranch = require( '../common/hasRemoteBranch' );
const npmUpdate = require( '../common/npmUpdate' );
const prompt = require( '../common/prompt' );
const setRepoVersion = require( '../common/setRepoVersion' );
const SimVersion = require( '../common/SimVersion' );
const updateDependenciesJSON = require( '../common/updateDependenciesJSON' );

/**
 * Deploys an rc version after incrementing the test version number.
 * @public
 *
 * @param {Object} grunt
 * @param {string} repo
 * @param {string} branch
 * @param {Array.<string>} brands
 */
module.exports = async function( grunt, repo, branch, brands ) {
  // TODO: does this happen for multiple brands?

  const major = parseInt( branch.split( '.' )[ 0 ], 10 );
  const minor = parseInt( branch.split( '.' )[ 1 ], 10 );
  assert( major > 0, 'Major version for a branch should be greater than zero' );
  assert( minor >= 0, 'Minor version for a branch should be greater than (or equal) to zero' );

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    grunt.fail.fatal( `Unclean status in ${repo}, cannot create release branch` );
  }

  if ( !( await hasRemoteBranch( repo, branch ) ) ) {
    const createBranchConfirmation = await prompt( `Release branch ${branch} does not exist. Create it? [Y/n]?` );
    if ( createBranchConfirmation === 'n' ) {
      grunt.fail.fatal( 'Aborted rc deployment due to non-existing branch' );
    }

    await createRelease( grunt, repo, branch );
  }

  await checkoutTarget( repo, branch, true ); // include npm update

  const previousVersion = await getRepoVersion( repo );

  if ( previousVersion.testType !== 'rc' && previousVersion.testType !== null ) {
    grunt.fail.fatal( `Aborted rc deployment since the version number cannot be incremented safely (testType:${previousVersion.testType})` );
  }

  // TODO: SimVersion brand removal
  const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance, 'phet', {
    testType: 'rc',
    testNumber: previousVersion.testNumber ? previousVersion.testNumber + 1 : 1
  } );

  // TODO: reduce this code duplication with dev.js
  const versionString = version.toString();
  const simPath = buildLocal.devDeployPath + repo;
  const versionPath = simPath + '/' + versionString;

  const versionPathExists = await devDirectoryExists( versionPath );

  if ( versionPathExists ) {
    grunt.fail.fatal( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
  }

  const initialConfirmation = await prompt( `Deploy ${versionString} to ${buildLocal.devDeployServer} [Y/n]?` );
  if ( initialConfirmation === 'n' ) {
    grunt.fail.fatal( 'Aborted rc deployment' );
  }

  await setRepoVersion( repo, version );
  await gitPush( repo, branch );

  // Make sure our correct npm dependencies are set
  await npmUpdate( repo );
  await npmUpdate( 'chipper' );

  // No special options required here, as we send the main request to the build server
  grunt.log.writeln( await build( repo, {
    brands
  } ) );

  const postBuildConfirmation = await prompt( `Please test the built version of ${repo}.\nIs it ready to deploy [Y/n]?` );
  if ( postBuildConfirmation === 'n' ) {
    // Abort version update
    await setRepoVersion( repo, previousVersion );
    await gitPush( repo, branch );

    // Abort checkout
    await checkoutMaster( repo );
    grunt.fail.fatal( 'Aborted rc deployment (aborted version change too).' );
  }

  // Move over dependencies.json and commit/push
  await updateDependenciesJSON( repo, brands, versionString, branch );

  // Send the build request
  await buildServerRequest( repo, version, await getDependencies( repo ), {
    rc: true
  } );

  // Move back to master
  await checkoutMaster( repo );

  const versionURL = `https://www.colorado.edu/physics/phet/dev/html/${repo}/${versionString}`;

  if ( brands.includes( 'phet' ) ) {
    grunt.log.writeln( `Deployed: ${versionURL}/phet/${repo}_en-phet.html` );
  }
  if ( brands.includes( 'phet-io' ) ) {
    grunt.log.writeln( `Deployed: ${versionURL}/phetio/wrappers/index` );
  }

  grunt.log.writeln( 'Please test!' );
};
