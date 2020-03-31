// Copyright 2017-2019, University of Colorado Boulder

/**
 * Deploys a decaf simulation after incrementing the test version number.  This file ported from dev.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line
const buildLocal = require( '../common/buildLocal' );
const devDirectoryExists = require( '../common/devDirectoryExists' );
const devScp = require( '../common/devScp' );
const devSsh = require( '../common/devSsh' );
const fs = require( 'fs' );
const getBranch = require( '../common/getBranch' );
const gitAdd = require( '../common/gitAdd' );
const gitCommit = require( '../common/gitCommit' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const getRemoteBranchSHAs = require( '../common/getRemoteBranchSHAs' );
const gitRevParse = require( '../common/gitRevParse' );
const grunt = require( 'grunt' );
const loadJSON = require( '../common/loadJSON' );
const writeJSON = require( '../common/writeJSON' );
const SimVersion = require( '../common/SimVersion' );
const vpnCheck = require( '../common/vpnCheck' );

/**
 * Deploys a dev version after incrementing the test version number.
 * @public
 *
 * @param {string} project
 * @param {Array.<string>} brands
 * @param {boolean} noninteractive
 * @param {string} branch - 'master' for normal dev deploys, otherwise is the name of a one-off branch
 * @param {string} [message] - Optional message to append to the version-increment commit.
 * @returns {Promise}
 */
module.exports = async function( project ) {
  if ( !( await vpnCheck() ) ) {
    grunt.fail.fatal( 'VPN or being on campus is required for this build. Ensure VPN is enabled, or that you have access to phet-server.int.colorado.edu' );
  }

  const currentBranch = await getBranch( 'decaf' );
  if ( currentBranch !== 'master' ) {
    grunt.fail.fatal( 'deployment should be on the branch master, not: ' + ( currentBranch ? currentBranch : '(detached head)' ) );
  }

  const packageFileRelative = `projects/${project}/package.json`;
  const packageFile = `../decaf/${packageFileRelative}`;
  const packageObject = await loadJSON( packageFile );
  const previousVersion = SimVersion.parse( packageObject.version );

  const isClean = await gitIsClean( 'decaf' );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${project}, cannot deploy` );
  }

  const currentSHA = await gitRevParse( 'decaf', 'HEAD' );

  const latestSHA = ( await getRemoteBranchSHAs( 'decaf' ) ).master;
  if ( currentSHA !== latestSHA ) {
    // See https://github.com/phetsims/chipper/issues/699
    grunt.fail.fatal( `Out of date with remote, please push or pull repo. Current SHA: ${currentSHA}, latest SHA: ${latestSHA}` );
  }

  // Bump the version
  const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance, {
    testType: 'dev',
    testNumber: previousVersion.testNumber + 1
  } );

  const versionString = version.toString();
  const simPath = buildLocal.decafDeployPath + project;
  const versionPath = simPath + '/' + versionString;

  let html = fs.readFileSync( '../decaf/html/template.html', 'utf-8' );
  html = html.split( '{{PROJECT}}' ).join( project );
  html = html.split( '{{VERSION}}' ).join( versionString );
  fs.writeFileSync( '../decaf/build/index.html',html );

  const simPathExists = await devDirectoryExists( simPath );
  const versionPathExists = await devDirectoryExists( versionPath );

  if ( versionPathExists ) {
    grunt.fail.fatal( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
  }

  // if ( !await booleanPrompt( `Deploy ${versionString} to ${buildLocal.devDeployServer}`, false ) ) {
  //   grunt.fail.fatal( 'Aborted deploy' );
  // }

  packageObject.version = version.toString();
  await writeJSON( packageFile, packageObject );
  await gitAdd( 'decaf', packageFileRelative );
  await gitCommit( 'decaf', `Bumping version to ${version.toString()}` );
  await gitPush( 'decaf', 'master' );

  // TODO: do we need a build step?
  // grunt.log.writeln( await build( project, {
  //   brands: brands,
  //   allHTML: true,
  //   debugHTML: true
  // } ) );

  // Create (and fix permissions for) the main simulation directory, if it didn't already exist
  if ( !simPathExists ) {
    await devSsh( `mkdir -p "${simPath}" && echo "IndexOrderDefault Descending Date\n" > "${simPath}/.htaccess"` );
  }

  // Create the version-specific directory
  await devSsh( `mkdir -p "${versionPath}"` );

  //
  // // Copy the build contents into the version-specific directory
  // for ( const brand of brands ) {
  console.log( `../decaf/projects/${project}` );
  console.log( `${versionPath}/` );
  await devScp( `../decaf/projects/${project}/${project}_all.jar`, `${versionPath}/` );
  await devScp( `../decaf/projects/${project}/${project}_all.jar.js`, `${versionPath}/` );
  await devScp( '../decaf/build/index.html', `${versionPath}/` );
  // }
  //
  // // If there is a protected directory and we are copying to the dev server, include the .htaccess file
  // // This is for PhET-iO simulations, to protected the password protected wrappers, see
  // // https://github.com/phetsims/phet-io/issues/641
  // if ( brands.includes( 'phet-io' ) && buildLocal.devDeployServer === 'bayes.colorado.edu' ) {
  //   const htaccessLocation = `../${project}/build/phet-io/`;
  //   await writePhetioHtaccess( htaccessLocation, null, versionPath );
  // }
  //
  // // Move over dependencies.json and commit/push
  // await updateDependenciesJSON( project, brands, versionString, branch );
  //
  const versionURL = `https://phet-dev.colorado.edu/decaf/${project}/${versionString}`;
  grunt.log.writeln( `Deployed: ${versionURL}/index.html` );
};
