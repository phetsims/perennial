// Copyright 2017, University of Colorado Boulder

/**
 * Deploys a phet-io wrapper (incrementing the version number)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line
const booleanPrompt = require( '../common/booleanPrompt' );
const buildLocal = require( '../common/buildLocal' );
const copyFile = require( '../common/copyFile' );
const devDirectoryExists = require( '../common/devDirectoryExists' );
const devScp = require( '../common/devScp' );
const devSsh = require( '../common/devSsh' );
const execute = require( '../common/execute' );
const getBranch = require( '../common/getBranch' );
const getRepoVersion = require( '../common/getRepoVersion' );
const gitIsClean = require( '../common/gitIsClean' );
const gitAdd = require( '../common/gitAdd' );
const gitCommit = require( '../common/gitCommit' );
const gitPush = require( '../common/gitPush' );
const grunt = require( 'grunt' );
const gruntCommand = require( '../common/gruntCommand' );
const npmUpdate = require( '../common/npmUpdate' );
const setRepoVersion = require( '../common/setRepoVersion' );
const SimVersion = require( '../common/SimVersion' );

/**
 * Deploys a phet-io wrapper (incrementing the version number)
 * @public
 *
 * TODO: deduplicate code (where possible) with dev.js
 *
 * @param {string} repo
 * @param {boolean} noninteractive
 * @returns {Promise}
 */
module.exports = async function( repo, noninteractive ) {
  const currentBranch = await getBranch( repo );
  if ( currentBranch !== 'master' ) {
    grunt.fail.fatal( 'Dev deployments are only supported from the master branch, not: ' + ( currentBranch ? currentBranch : '(detached head)' ) );
  }

  const previousVersion = await getRepoVersion( repo );

  if ( previousVersion.testType !== 'dev' ) {
    grunt.fail.fatal( 'The current version identifier is not a dev version, aborting.' );
  }

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot deploy` );
  }

  // Bump the version
  const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance, {
    testType: 'dev',
    testNumber: previousVersion.testNumber + 1
    // TODO: handle one-off things
  } );

  const versionString = version.toString();

  const wrapperPath = buildLocal.devDeployPath + repo;
  const versionPath = wrapperPath + '/' + versionString;

  const wrapperPathExists = await devDirectoryExists( wrapperPath );
  const versionPathExists = await devDirectoryExists( versionPath );

  if ( versionPathExists ) {
    grunt.fail.fatal( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
  }

  if ( !await booleanPrompt( `Deploy ${versionString} to ${buildLocal.devDeployServer}`, noninteractive ) ) {
    grunt.fail.fatal( 'Aborted wrapper deploy' );
  }

  await setRepoVersion( repo, version );
  await gitPush( repo, 'master' );

  // Make sure our correct npm dependencies are set
  await npmUpdate( repo );
  await npmUpdate( 'chipper' );

  grunt.log.writeln( await execute( gruntCommand, [], `../${repo}` ) );

  // Create (and fix permissions for) the main simulation directory, if it didn't already exist
  if ( !wrapperPathExists ) {
    await devSsh( `mkdir -p "${wrapperPath}" && echo "IndexOrderDefault Descending Date\n" > "${wrapperPath}/.htaccess"` );
    await devSsh( `chmod -R g+w "${wrapperPath}"` );
  }

  // Create the version-specific directory
  await devSsh( `mkdir -p "${versionPath}"` );

  // Copy the build contents into the version-specific directory
  await devScp( `../${repo}/build/*`, `${versionPath}/` );

  // Permissions fixes so others can write over it later
  await devSsh( `chmod g+w "${versionPath}"` );

  // Move over dependencies.json and commit/push
  // TODO: don't do this twice if we want to deploy both brands
  await copyFile( `../${repo}/build/dependencies.json`, `../${repo}/dependencies.json` );
  await gitAdd( repo, 'dependencies.json' );
  await gitCommit( repo, `updated dependencies.json for version ${versionString}` );
  await gitPush( repo, 'master' );

  grunt.log.writeln( `Deployed https://www.colorado.edu/physics/phet/dev/html/${repo}/${versionString}` );
};
