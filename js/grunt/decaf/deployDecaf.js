// Copyright 2017-2019, University of Colorado Boulder

/**
 * Deploys a decaf simulation after incrementing the test version number.  This file ported from dev.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

'use strict';

const SimVersion = require( '../../common/SimVersion' );
const buildLocal = require( '../../common/buildLocal' );
const devDirectoryExists = require( '../../common/devDirectoryExists' );
const devScp = require( '../../common/devScp' );
const devSsh = require( '../../common/devSsh' );
const getBranch = require( '../../common/getBranch' );
const getRemoteBranchSHAs = require( '../../common/getRemoteBranchSHAs' );
const gitIsClean = require( '../../common/gitIsClean' );
const gitRevParse = require( '../../common/gitRevParse' );
const loadJSON = require( '../../common/loadJSON' );
const vpnCheck = require( '../../common/vpnCheck' );
const grunt = require( 'grunt' );
const _ = require( 'lodash' ); // eslint-disable-line

/**
 * Deploys a dev version after incrementing the test version number.
 * @public
 *
 * @param {string} project
 * @param {boolean} dev
 * @param {boolean} production
 * @param {string} username
 * @returns {Promise}
 */
module.exports = async function( project, dev, production, username ) {
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
  const version = SimVersion.parse( packageObject.version );

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

  const versionString = version.toString();


  // await gitAdd( 'decaf', packageFileRelative );
  // await gitCommit( 'decaf', `Bumping version to ${version.toString()}` );
  // await gitPush( 'decaf', 'master' );

  // Create (and fix permissions for) the main simulation directory, if it didn't already exist
  if ( dev ) {

    const simPath = buildLocal.decafDeployPath + project;
    const versionPath = simPath + '/' + versionString;

    const simPathExists = await devDirectoryExists( simPath );
    const versionPathExists = await devDirectoryExists( versionPath );

    if ( versionPathExists ) {
      grunt.fail.fatal( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
    }

    if ( !simPathExists ) {
      await devSsh( `mkdir -p "${simPath}" && echo "IndexOrderDefault Descending Date\n" > "${simPath}/.htaccess"` );
    }

    // Create the version-specific directory
    await devSsh( `mkdir -p "${versionPath}"` );

    // Copy the build contents into the version-specific directory
    console.log( `../decaf/projects/${project}` );
    console.log( `${versionPath}/` );
    await devScp( `../decaf/projects/${project}/build/${project}_all.jar`, `${versionPath}/` );
    await devScp( `../decaf/projects/${project}/build/${project}_all.jar.js`, `${versionPath}/` );
    await devScp( `../decaf/projects/${project}/build/${project}.html`, `${versionPath}/` );
    await devScp( `../decaf/projects/${project}/build/splash.gif`, `${versionPath}/` );
    await devScp( `../decaf/projects/${project}/build/style.css`, `${versionPath}/` );
    await devScp( `../decaf/projects/${project}/build/dependencies.json`, `${versionPath}/` );

    const versionURL = `https://phet-dev.colorado.edu/decaf/${project}/${versionString}`;
    grunt.log.writeln( `Deployed: ${versionURL}/${project}.html` );
  }

  if ( production ) {
    // await devSsh( `mkdir -p "/data/web/static/phetsims/sims/cheerpj/${project}"` );
    const template = `cd /data/web/static/phetsims/sims/cheerpj/
mkdir ${project}
cd ${project}
scp -r ${username}@bayes.colorado.edu:/data/web/htdocs/dev/decaf/${project}/${version} .

sudo chmod g+w *
printf "RewriteEngine on\\nRewriteBase /sims/cheerpj/${project}/\\nRewriteRule ^latest(.*) ${version}\\$1\\nHeader set Access-Control-Allow-Origin \\"*\\"\\n" > .htaccess

cd ${version}
sudo chmod g+w *
`;
    console.log( 'SERVER SCRIPT TO PROMOTE DEV VERSION TO PRODUCTION VERSION' );
    console.log( template );
  }
};