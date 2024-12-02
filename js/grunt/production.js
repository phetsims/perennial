// Copyright 2017, University of Colorado Boulder

/**
 * Deploys a production version after incrementing the test version number.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const SimVersion = require( '../browser-and-node/SimVersion' ).default;
const booleanPrompt = require( '../common/booleanPrompt' );
const build = require( '../common/build' );
const buildServerRequest = require( '../common/buildServerRequest' );
const checkoutMain = require( '../common/checkoutMain' );
const checkoutTarget = require( '../common/checkoutTarget' );
const execute = require( '../common/execute' ).default;
const getDependencies = require( '../common/getDependencies' );
const getRepoVersion = require( '../common/getRepoVersion' );
const gitAdd = require( '../common/gitAdd' );
const gitCommit = require( '../common/gitCommit' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const grunt = require( 'grunt' );
const gruntCommand = require( '../common/gruntCommand' );
const hasRemoteBranch = require( '../common/hasRemoteBranch' );
const isPublished = require( '../common/isPublished' );
const npmUpdate = require( '../common/npmUpdate' );
const setRepoVersion = require( '../common/setRepoVersion' );
const simMetadata = require( '../common/simMetadata' );
const updateDependenciesJSON = require( '../common/updateDependenciesJSON' );
const vpnCheck = require( '../common/vpnCheck' );
const buildLocal = require( '../common/buildLocal' );
const assert = require( 'assert' );

/**
 * Deploys a production version after incrementing the test version number.
 * @public
 *
 * @param {string} repo
 * @param {string} branch
 * @param {Array.<string>} brands
 * @param {boolean} noninteractive
 * @param {boolean} redeploy
 * @param {string} [message] - Optional message to append to the version-increment commit.
 * @returns {Promise.<SimVersion>}
 */
module.exports = async function production( repo, branch, brands, noninteractive, redeploy, message ) {
  SimVersion.ensureReleaseBranch( branch );

  if ( !( await vpnCheck() ) ) {
    grunt.fail.fatal( 'VPN or being on campus is required for this build. Ensure VPN is enabled, or that you have access to phet-server2.int.colorado.edu' );
  }

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot create release branch` );
  }

  if ( !( await hasRemoteBranch( repo, branch ) ) ) {
    throw new Error( `Cannot find release branch ${branch} for ${repo}` );
  }

  if ( !grunt.file.exists( `../${repo}/assets/${repo}-screenshot.png` ) && brands.includes( 'phet' ) ) {
    throw new Error( `Missing screenshot file (${repo}/assets/${repo}-screenshot.png), aborting production deployment` );
  }

  if ( !await booleanPrompt( 'Are QA credits up-to-date?', noninteractive ) ) {
    throw new Error( 'Aborted production deployment' );
  }

  if ( !await booleanPrompt( 'Have all maintenance patches that need spot checks been tested? (An issue would be created in the sim repo)', noninteractive ) ) {
    throw new Error( 'Aborted production deployment' );
  }

  redeploy && assert( noninteractive, 'redeploy can only be specified with noninteractive:true' );

  const published = await isPublished( repo );

  await checkoutTarget( repo, branch, true ); // include npm update

  try {
    const previousVersion = await getRepoVersion( repo );
    let version;
    let versionChanged;

    if ( previousVersion.testType === null ) {

      // redeploy flag can bypass this prompt and error
      if ( !redeploy && ( noninteractive || !await booleanPrompt( `The last deployment was a production deployment (${previousVersion.toString()}) and an RC version is required between production versions. Would you like to redeploy ${previousVersion.toString()} (y) or cancel this process and revert to main (N)`, false ) ) ) {
        throw new Error( 'Aborted production deployment: It appears that the last deployment was for production.' );
      }

      version = previousVersion;
      versionChanged = false;
    }
    else if ( previousVersion.testType === 'rc' ) {
      version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance );
      versionChanged = true;
    }
    else {
      throw new Error( 'Aborted production deployment since the version number cannot be incremented safely' );
    }

    const isFirstVersion = !( await simMetadata( {
      simulation: repo
    } ) ).projects;

    // Initial deployment nags
    if ( isFirstVersion ) {
      if ( !await booleanPrompt( 'Is the main checklist complete (e.g. are screenshots added to assets, etc.)', noninteractive ) ) {
        throw new Error( 'Aborted production deployment' );
      }
    }

    const versionString = version.toString();

    // caps-lock should hopefully shout this at people. do we have a text-to-speech synthesizer we can shout out of their speakers?
    // SECOND THOUGHT: this would be horrible during automated maintenance releases.
    if ( !await booleanPrompt( `DEPLOY ${repo} ${versionString} (brands: ${brands.join( ',' )}) to PRODUCTION`, noninteractive ) ) {
      throw new Error( 'Aborted production deployment' );
    }

    if ( versionChanged ) {
      await setRepoVersion( repo, version, message );
      await gitPush( repo, branch );
    }

    // Make sure our correct npm dependencies are set
    await npmUpdate( repo );
    await npmUpdate( 'chipper' );
    await npmUpdate( 'perennial-alias' );

    // Update the README on the branch
    if ( published ) {
      grunt.log.writeln( 'Updating branch README' );
      try {
        await execute( gruntCommand, [ 'published-readme' ], `../${repo}` );
      }
      catch( e ) {
        grunt.log.writeln( 'published-readme error, may not exist, will try generate-published-README' );
        try {
          await execute( gruntCommand, [ 'generate-published-README' ], `../${repo}` );
        }
        catch( e ) {
          grunt.log.writeln( 'No published README generation found' );
        }
      }
      await gitAdd( repo, 'README.md' );
      try {
        await gitCommit( repo, `Generated published README.md as part of a production deploy for ${versionString}` );
        await gitPush( repo, branch );
      }
      catch( e ) {
        grunt.log.writeln( 'Production README is already up-to-date' );
      }
    }

    // No special options required here, as we send the main request to the build server
    grunt.log.writeln( await build( repo, {
      brands: brands,
      minify: !noninteractive
    } ) );

    /**
     * The necessary clean up steps to do if aborting after the build
     * @param {string} message - message to error out with
     * @returns {Promise.<void>}
     */
    const postBuildAbort = async message => {

      // Abort version update
      if ( versionChanged ) {
        await setRepoVersion( repo, previousVersion, message );
        await gitPush( repo, branch );
      }

      // Abort checkout, (will be caught and main will be checked out
      throw new Error( message );
    };


    if ( !await booleanPrompt( `Please test the built version of ${repo}.\nIs it ready to deploy?`, noninteractive ) ) {
      await postBuildAbort( 'Aborted production deployment (aborted version change too).' );
    }

    // Move over dependencies.json and commit/push
    await updateDependenciesJSON( repo, brands, versionString, branch );

    // Send the build request
    await buildServerRequest( repo, version, branch, await getDependencies( repo ), {
      locales: '*',
      brands: brands,
      servers: [ 'dev', 'production' ]
    } );

    // Move back to main
    await checkoutMain( repo, true );

    if ( brands.includes( 'phet' ) ) {
      grunt.log.writeln( `Deployed: https://phet.colorado.edu/sims/html/${repo}/latest/${repo}_all.html` );
    }
    if ( brands.includes( 'phet-io' ) ) {
      grunt.log.writeln( `Deployed: https://phet-io.colorado.edu/sims/${repo}/${versionString}/` );
    }

    grunt.log.writeln( 'Please wait for the build-server to complete the deployment, and then test!' );
    grunt.log.writeln( `To view the current build status, visit ${buildLocal.productionServerURL}/deploy-status` );

    if ( isFirstVersion && brands.includes( 'phet' ) ) {
      grunt.log.writeln( 'After testing, let the simulation lead know it has been deployed, so they can edit metadata on the website' );

      // Update the README on main
      if ( published ) {
        grunt.log.writeln( 'Updating main README' );
        await execute( gruntCommand, [ 'published-readme' ], `../${repo}` );
        await gitAdd( repo, 'README.md' );
        try {
          await gitCommit( repo, `Generated published README.md as part of a production deploy for ${versionString}` );
          await gitPush( repo, 'main' );
        }
        catch( e ) {
          grunt.log.writeln( 'Production README is already up-to-date' );
        }
      }
    }

    // phet-io nags from the checklist
    if ( brands.includes( 'phet-io' ) ) {
      const phetioLogText = `
PhET-iO deploys involve a couple of extra steps after production. Please ensure the following are accomplished:
1. Make sure the sim is listed in perennial/data/phet-io-api-stable if it has had a designed production release (and that the API is up to date).
2. Make sure the sim is listed in perennial/data/phet-io-hydrogen.json. It is almost certainly part of this featureset. 
3. Create an issue in the phet-io repo using the "New PhET-iO Simulation Publication" issue template.
      `;
      grunt.log.writeln( phetioLogText );
    }

    return version;
  }
  catch( e ) {
    grunt.log.warn( 'Detected failure during deploy, reverting to main' );
    await checkoutMain( repo, true );
    throw e;
  }
};