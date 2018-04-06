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
const assert = require( 'assert' );
const booleanPrompt = require( '../common/booleanPrompt' );
const build = require( '../common/build' );
const buildLocal = require( '../common/buildLocal' );
const devDirectoryExists = require( '../common/devDirectoryExists' );
const devScp = require( '../common/devScp' );
const devSsh = require( '../common/devSsh' );
const getBranch = require( '../common/getBranch' );
const getRepoVersion = require( '../common/getRepoVersion' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const grunt = require( 'grunt' );
const lintAllRunnable = require( '../common/lintAllRunnable' );
const npmUpdate = require( '../common/npmUpdate' );
const setRepoVersion = require( '../common/setRepoVersion' );
const SimVersion = require( '../common/SimVersion' );
const updateDependenciesJSON = require( '../common/updateDependenciesJSON' );

/**
 * Deploys a dev version after incrementing the test version number.
 * @public
 *
 * @param {string} repo
 * @param {Array.<string>} brands
 * @param {boolean} noninteractive
 * @param {string} - 'master' for normal dev deploys, otherwise is the name of a one-off branch
 * @param {string} [message] - Optional message to append to the version-increment commit.
 * @returns {Promise}
 */
module.exports = async function( repo, brands, noninteractive, branch, message ) {
  const isOneOff = branch !== 'master';
  const testType = isOneOff ? branch : 'dev';
  if ( isOneOff ) {
    assert( !branch.includes( '-' ), 'One-off versions should be from branches that do not include hyphens' );
  }

  const currentBranch = await getBranch( repo );
  if ( currentBranch !== branch ) {
    grunt.fail.fatal( `${testType} deployment should be on the branch ${branch}, not: ` + ( currentBranch ? currentBranch : '(detached head)' ) );
  }

  const previousVersion = await getRepoVersion( repo );

  if ( previousVersion.testType !== testType ) {
    if ( isOneOff ) {
      grunt.fail.fatal( `The current version identifier is not a one-off version (should be something like ${previousVersion.major}.${previousVersion.minor}.${previousVersion.maintenance}-${testType}.${previousVersion.testNumber === null ? '0' : previousVersion.testNumber}), aborting.` );
    }
    else {
      grunt.fail.fatal( 'The current version identifier is not a dev version, aborting.' );
    }
  }

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot deploy` );
  }

  // Ensure we don't try to request an unsupported brand
  const supportedBrands = grunt.file.readJSON( `../${repo}/package.json` ).phet.supportedBrands;
  brands.forEach( brand => assert( supportedBrands.includes( brand ), `Brand ${brand} not included in ${repo}'s supported brands: ${supportedBrands.join( ',' )}` ) );

  // Ensure that the repository and its dependencies pass lint before continuing.
  // See https://github.com/phetsims/perennial/issues/76
  await lintAllRunnable( repo );

  // Bump the version
  const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance, {
    testType: testType,
    testNumber: previousVersion.testNumber + 1
  } );

  const versionString = version.toString();
  const simPath = buildLocal.devDeployPath + repo;
  const versionPath = simPath + '/' + versionString;

  const simPathExists = await devDirectoryExists( simPath );
  const versionPathExists = await devDirectoryExists( versionPath );

  if ( versionPathExists ) {
    grunt.fail.fatal( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
  }

  if ( !await booleanPrompt( `Deploy ${versionString} to ${buildLocal.devDeployServer}`, noninteractive ) ) {
    grunt.fail.fatal( `Aborted ${testType} deploy` );
  }

  await setRepoVersion( repo, version, message );
  await gitPush( repo, branch );

  // Make sure our correct npm dependencies are set
  await npmUpdate( repo );
  await npmUpdate( 'chipper' );

  grunt.log.writeln( await build( repo, {
    brands,
    allHTML: true,
    debugHTML: true
  } ) );

  // Create (and fix permissions for) the main simulation directory, if it didn't already exist
  if ( !simPathExists ) {
    await devSsh( `mkdir -p "${simPath}" && echo "IndexOrderDefault Descending Date\n" > "${simPath}/.htaccess"` );
    await devSsh( `chmod -R g+w "${simPath}"` );
  }

  // Create the version-specific directory
  await devSsh( `mkdir -p "${versionPath}"` );

  // Copy the build contents into the version-specific directory
  for ( let brand of brands ) {
    await devScp( `../${repo}/build/${brand}`, `${versionPath}/` );
  }

  // If there is a protected directory and we are copying to the dev server, include the .htaccess file
  // This is for PhET-iO simulations, to protected the password protected wrappers, see
  // https://github.com/phetsims/phet-io/issues/641
  if ( brands.includes( 'phet-io' ) && buildLocal.devDeployServer === 'bayes.colorado.edu' ) {
    await devScp( '../phet-io/templates/spot/.htaccess', `${versionPath}/phet-io/wrappers/.htaccess` );
  }

  // Permissions fixes so others can write over it later
  await devSsh( `chmod g+w "${versionPath}"` );

  // Move over dependencies.json and commit/push
  await updateDependenciesJSON( repo, brands, versionString, branch );

  const versionURL = `https://www.colorado.edu/physics/phet/dev/html/${repo}/${versionString}`;

  if ( brands.includes( 'phet' ) ) {
    grunt.log.writeln( `Deployed: ${versionURL}/phet/${repo}_en_phet.html` );
  }
  if ( brands.includes( 'phet-io' ) ) {
    grunt.log.writeln( `Deployed: ${versionURL}/phet-io/wrappers/index` );
  }
};
