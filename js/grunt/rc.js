// Copyright 2017, University of Colorado Boulder

/**
 * Deploys an rc version after incrementing the test version number.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const SimVersion = require( '../browser-and-node/SimVersion' ).default;
const booleanPrompt = require( '../common/booleanPrompt' );
const build = require( '../common/build' );
const buildLocal = require( '../common/buildLocal' );
const buildServerRequest = require( '../common/buildServerRequest' );
const checkoutMain = require( '../common/checkoutMain' );
const checkoutTarget = require( '../common/checkoutTarget' );
const devDirectoryExists = require( '../common/devDirectoryExists' );
const getDependencies = require( '../common/getDependencies' );
const getRepoVersion = require( '../common/getRepoVersion' );
const gitCheckout = require( '../common/gitCheckout' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const hasRemoteBranch = require( '../common/hasRemoteBranch' );
const loadJSON = require( '../common/loadJSON' );
const npmUpdate = require( '../common/npmUpdate' );
const setRepoVersion = require( '../common/setRepoVersion' );
const updateDependenciesJSON = require( '../common/updateDependenciesJSON' );
const vpnCheck = require( '../common/vpnCheck' );
const createRelease = require( './createRelease' );
const grunt = require( 'grunt' );

const cancelLog = problem => grunt.log.writeln( 'Cancelling RC deployment: ' + problem );
const handleError = problem => {
  cancelLog( problem );
  throw new Error( 'Aborted RC deployment: ' + problem );
};

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
module.exports = async function rc( repo, branch, brands, noninteractive, message ) {
  SimVersion.ensureReleaseBranch( branch );

  if ( !( await vpnCheck() ) ) {
    handleError( 'VPN or being on campus is required for this build. Ensure VPN is enabled, or that you have access to phet-server2.int.colorado.edu' );
  }

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    handleError( `Unclean status in ${repo}, cannot create release branch` );
  }

  if ( !( await hasRemoteBranch( repo, branch ) ) ) {
    if ( noninteractive || !await booleanPrompt( `Release branch ${branch} does not exist. Create it?`, false ) ) {
      handleError( 'Release branch does not exist' );
    }

    await createRelease( repo, branch, brands );
  }

  // PhET-iO simulations require validation for RCs. Error out if "phet.phet-io.validation=false" is in package.json.
  await gitCheckout( repo, branch );
  if ( brands.includes( 'phet-io' ) ) {
    const packageObject = await loadJSON( `../${repo}/package.json` );
    if ( packageObject.phet[ 'phet-io' ] && packageObject.phet[ 'phet-io' ].hasOwnProperty( 'validation' ) &&
         !packageObject.phet[ 'phet-io' ].validation ) {
      handleError( 'PhET-iO simulations require validation for RCs' );
    }
  }

  // npm updates are below, after all interactive prompts
  await checkoutTarget( repo, branch, false );

  try {
    const previousVersion = await getRepoVersion( repo );

    if ( previousVersion.testType !== 'rc' && previousVersion.testType !== null ) {
      handleError( `RC version number cannot be incremented safely: ${previousVersion}` );
    }

    const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance + ( previousVersion.testType === null ? 1 : 0 ), {
      testType: 'rc',
      testNumber: previousVersion.testNumber ? previousVersion.testNumber + 1 : 1
    } );

    const versionString = version.toString();
    const simPath = buildLocal.devDeployPath + repo;
    const versionPath = `${simPath}/${versionString}`;

    const versionPathExists = await devDirectoryExists( versionPath );

    if ( versionPathExists ) {
      handleError( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
    }

    if ( !await booleanPrompt( `Deploy ${versionString} to ${buildLocal.devDeployServer}`, noninteractive ) ) {
      handleError( '"Deploy" user request' );
    }

    await setRepoVersion( repo, version, message );
    await gitPush( repo, branch );

    // Make sure our correct npm dependencies are set
    await npmUpdate( repo );
    await npmUpdate( 'chipper' );
    await npmUpdate( 'perennial-alias' );

    // No special options required here, as we send the main request to the build server
    grunt.log.writeln( await build( repo, {
      brands: brands,
      minify: !noninteractive
    } ) );

    /**
     * The necessary clean up steps to do if aborting after the build
     */
    const postBuildAbort = async problem => {
      cancelLog( problem );

      // Abort version update
      await setRepoVersion( repo, previousVersion, message );
      await gitPush( repo, branch );

      // Abort checkout, (will be caught and main will be checked out)
      handleError( problem );
    };

    if ( !await booleanPrompt( `Please test the built version of ${repo}.\nIs it ready to deploy`, noninteractive ) ) {
      await postBuildAbort( `Built sim test failed, reverting back to ${previousVersion}` );
    }

    // Move over dependencies.json and commit/push
    await updateDependenciesJSON( repo, brands, versionString, branch );

    // Send the build request
    await buildServerRequest( repo, version, branch, await getDependencies( repo ), {
      locales: [ '*' ],
      brands: brands,
      servers: [ 'dev' ]
    } );

    // Move back to main
    await checkoutMain( repo, true );

    const versionURL = `https://phet-dev.colorado.edu/html/${repo}/${versionString}`;

    if ( brands.includes( 'phet' ) ) {
      grunt.log.writeln( `Deployed: ${versionURL}/phet/${repo}_all_phet.html` );
    }
    if ( brands.includes( 'phet-io' ) ) {
      grunt.log.writeln( `Deployed: ${versionURL}/phet-io/` );
    }

    grunt.log.writeln( 'Please wait for the build-server to complete the deployment, and then test!' );
    grunt.log.writeln( `To view the current build status, visit ${buildLocal.productionServerURL}/deploy-status` );

    return version;
  }
  catch( e ) {
    grunt.log.warn( 'Detected failure during deploy, reverting to main.' );
    await checkoutMain( repo, true );
    throw e;
  }
};