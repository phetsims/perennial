// Copyright 2017-2019, University of Colorado Boulder

/**
 * Deploys a decaf simulation after incrementing the test version number.  This file ported from dev.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */


const assert = require( 'assert' );
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
const _ = require( 'lodash' ); // eslint-disable-line no-unused-vars
const fs = require( 'fs' );

// constants
const BUILD_LOCAL_FILENAME = `${process.env.HOME}/.phet/build-local.json`;

/**
 * Deploys a dev version after incrementing the test version number.
 * @public
 *
 * @param {string} project
 * @param {boolean} dev
 * @param {boolean} production
 * @returns {Promise}
 */
module.exports = async function( project, dev, production ) {

  const buildLocalJSON = JSON.parse( fs.readFileSync( BUILD_LOCAL_FILENAME, { encoding: 'utf-8' } ) );
  const gitRoot = buildLocalJSON.gitRoot;
  const trunkPath = buildLocalJSON.decafTrunkPath;

  assert && assert( gitRoot !== undefined, 'buildLocal.gitRoot is undefined' );
  assert && assert( trunkPath !== undefined, 'buildLocal.decafTrunkPath is undefined' );

  const stringFiles = fs.readdirSync( `${trunkPath}/simulations-java/simulations/${project}/data/${project}/localization` );
  const locales = stringFiles.filter( stringFile => stringFile.indexOf( '_' ) >= 0 ).map( file => file.substring( file.indexOf( '_' ) + 1, file.lastIndexOf( '.' ) ) );
  console.log( locales.join( '\n' ) );

  // Output the flavors and locales
  const javaProperties = fs.readFileSync( `${trunkPath}/simulations-java/simulations/${project}/${project}-build.properties`, 'utf-8' );
  // console.log(javaProperties);

// like  project.flavor.moving-man.mainclass=edu.colorado.phet.movingman.MovingManApplication

  const flavorLines = javaProperties.split( '\n' ).filter( line => line.startsWith( 'project.flavor' ) );
  const flavors = flavorLines.length > 0 ? flavorLines.map( line => line.split( '.' )[ 2 ] ) : [ `${project}` ];
  console.log( flavors.join( '\n' ) );

  if ( !( await vpnCheck() ) ) {
    grunt.fail.fatal( 'VPN or being on campus is required for this build. Ensure VPN is enabled, or that you have access to phet-server2.int.colorado.edu' );
  }

  const currentBranch = await getBranch( 'decaf' );
  if ( currentBranch !== 'master' ) {
    grunt.fail.fatal( `deployment should be on the branch master, not: ${currentBranch ? currentBranch : '(detached head)'}` );
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
    const versionPath = `${simPath}/${versionString}`;

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
    await devScp( `../decaf/projects/${project}/build/locales.txt`, `${versionPath}/` );
    await devScp( `../decaf/projects/${project}/build/simulations.txt`, `${versionPath}/` );

    const versionURL = `https://phet-dev.colorado.edu/decaf/${project}/${versionString}`;
    console.log( 'DEPLOYED' );

    if ( !fs.existsSync( `${gitRoot}/decaf/build/log.txt` ) ) {
      fs.mkdirSync( `${gitRoot}/decaf/build` );
    }

    flavors.forEach( flavor => {
      const url = `${versionURL}/${project}.html?simulation=${flavor}`;
      grunt.log.writeln( url );
      fs.appendFileSync( `${gitRoot}/decaf/build/log.txt`, `${url}\n` );
    } );

    if ( flavors.length === 0 ) {
      const URL = `${versionURL}/${project}.html`;
      grunt.log.writeln( URL );
      fs.appendFileSync( `${gitRoot}/decaf/build/log.txt`, `${URL}\n` );
    }
  }

  console.log( 'FLAVORS' );
  console.log( flavors.join( ', ' ) );

  console.log( 'LOCALES' );
  console.log( locales.join( ', ' ) );

  if ( production ) {
    const productionServerURL = buildLocal.productionServerURL || 'https://phet.colorado.edu';
    // await devSsh( `mkdir -p "/data/web/static/phetsims/sims/cheerpj/${project}"` );
    const template = `cd /data/web/static/phetsims/sims/cheerpj/
sudo -u phet-admin mkdir -p ${project}
cd ${project}
sudo -u phet-admin scp -r bayes.colorado.edu:/data/web/htdocs/dev/decaf/${project}/${version} .

sudo chmod g+w *
printf "RewriteEngine on\\nRewriteBase /sims/cheerpj/${project}/\\nRewriteRule ^latest(.*) ${version}\\$1\\nHeader set Access-Control-Allow-Origin \\"*\\"\\n" > .htaccess

cd ${version}
sudo chmod g+w *

token=$(grep serverToken ~/.phet/build-local.json | sed -r 's/ *"serverToken": "(.*)",/\\1/') && \\
curl -u "token:$\{token}" '${productionServerURL}/services/deploy-cheerpj?project=${project}&version=${version}&locales=${locales.join( ',' )}&simulations=${flavors.join( ',' )}'
`;
    console.log( 'SERVER SCRIPT TO PROMOTE DEV VERSION TO PRODUCTION VERSION' );
    console.log( template );
  }
};