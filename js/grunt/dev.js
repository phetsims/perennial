// Copyright 2017, University of Colorado Boulder

/**
 * Deploys a dev version after incrementing the test version number.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line
const build = require( '../common/build' );
const buildLocal = require( '../common/buildLocal' );
const copyFile = require( '../common/copyFile' );
const devDirectoryExists = require( '../common/devDirectoryExists' );
const devScp = require( '../common/devScp' );
const devSsh = require( '../common/devSsh' );
const getBranch = require( '../common/getBranch' );
const getRepoVersion = require( '../common/getRepoVersion' );
const gitIsClean = require( '../common/gitIsClean' );
const gitAdd = require( '../common/gitAdd' );
const gitCommit = require( '../common/gitCommit' );
const gitPush = require( '../common/gitPush' );
const prompt = require( '../common/prompt' );
const setRepoVersion = require( '../common/setRepoVersion' );

/**
 * Deploys a dev version after incrementing the test version number.
 * @public
 *
 * @param {Object} grunt
 * @param {string} repo
 * @param {string} brand
 */
module.exports = async function( grunt, repo, brand ) {
  const branch = await getBranch( repo );
  if ( branch !== 'master' ) {
    grunt.fail.fatal( 'Dev deployments are only supported from the master branch, not: ' + ( branch ? branch : '(detached head)' ) );
  }

  const version = await getRepoVersion( repo );

  if ( version.testType !== 'dev' ) {
    grunt.fail.fatal( 'The current version identifier is not a dev version, aborting.' );
  }

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot deploy` );
  }

  // Bump the version
  version.testNumber++;
  const versionString = version.toString();

  const simPath = buildLocal.devDeployPath + repo;
  const versionPath = simPath + '/' + versionString;

  const simPathExists = await devDirectoryExists( simPath );
  const versionPathExists = await devDirectoryExists( versionPath );

  if ( versionPathExists ) {
    grunt.fail.fatal( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
  }

  const confirmation = await prompt( `Deploy ${versionString} to ${buildLocal.devDeployServer} [Y/n]?` );
  if ( confirmation === 'n' ) {
    throw new Error( 'Aborted dev deploy' );
  }

  await setRepoVersion( repo, version );
  await gitPush( repo, 'master' );

  grunt.log.writeln( await build( repo, {
    brand
  } ) );

  // Create (and fix permissions for) the main simulation directory, if it didn't already exist
  if ( !simPathExists ) {
    await devSsh( `mkdir -p "${simPath}" && echo "IndexOrderDefault Descending Date\n" > "${simPath}/.htaccess"` );
    await devSsh( `chmod -R g+w "${simPath}"` );
  }

  // Create the version-specific directory
  await devSsh( `mkdir -p "${versionPath}"` );

  // Copy the build contents into the version-specific directory
  await devScp( `../${repo}/build/*`, `${versionPath}/` );

  // If there is a protected directory and we are copying to spot, include the .htaccess file
  // This is for PhET-iO simulations, to protected the password protected wrappers, see
  // https://github.com/phetsims/phet-io/issues/641
  if ( brand === 'phet-io' && buildLocal.devDeployServer === 'spot.colorado.edu' ) {
    await devScp( '../phet-io/templates/spot/.htaccess', `${versionPath}/wrappers/.htaccess` );
  }

  // Permissions fixes so others can write over it later
  await devSsh( `chmod g+w "${versionPath}"` );

  // Move over dependencies.json and commit/push
  await copyFile( `../${repo}/build/dependencies.json`, `../${repo}/dependencies.json` );
  await gitAdd( repo, 'dependencies.json' );
  await gitCommit( repo, `updated dependencies.json for version ${versionString}` );
  await gitPush( repo, 'master' );
};
