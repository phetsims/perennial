// Copyright 2017, University of Colorado Boulder

/**
 * Deploys a production version after incrementing the test version number.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line
const booleanPrompt = require( '../common/booleanPrompt' );
const build = require( '../common/build' );
const buildServerRequest = require( '../common/buildServerRequest' );
const checkoutMaster = require( '../common/checkoutMaster' );
const checkoutTarget = require( '../common/checkoutTarget' );
const execute = require( '../common/execute' );
const getDependencies = require( '../common/getDependencies' );
const getRepoVersion = require( '../common/getRepoVersion' );
const gitAdd = require( '../common/gitAdd' );
const gitCheckout = require( '../common/gitCheckout' );
const gitCommit = require( '../common/gitCommit' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const grunt = require( 'grunt' );
const gruntCommand = require( '../common/gruntCommand' );
const hasRemoteBranch = require( '../common/hasRemoteBranch' );
const npmUpdate = require( '../common/npmUpdate' );
const setRepoVersion = require( '../common/setRepoVersion' );
const simMetadata = require( '../common/simMetadata' );
const SimVersion = require( '../common/SimVersion' );
const updateDependenciesJSON = require( '../common/updateDependenciesJSON' );

/**
 * Deploys a production version after incrementing the test version number.
 * @public
 *
 * @param {string} repo
 * @param {string} branch
 * @param {Array.<string>} brands
 * @param {boolean} noninteractive
 * @returns {Promise}
 */
module.exports = async function( repo, branch, brands, noninteractive ) {
  SimVersion.ensureReleaseBranch( branch );

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    grunt.fail.fatal( `Unclean status in ${repo}, cannot create release branch` );
  }

  if ( !( await hasRemoteBranch( repo, branch ) ) ) {
    grunt.fail.fatal( `Cannot find release branch ${branch} for ${repo}` );
  }

  if ( !grunt.file.exists( `../${repo}/assets/${repo}-screenshot.png` ) ) {
    grunt.fail.fatal( `Missing screenshot file (${repo}/assets/${repo}-screenshot.png), aborting production deployment` );    
  }

  if ( !await booleanPrompt( 'Are QA credits up-to-date', noninteractive ) ) {
    grunt.fail.fatal( 'Aborted production deployment' );
  }

  await checkoutTarget( repo, branch, true ); // include npm update

  try {
    const previousVersion = await getRepoVersion( repo );
    var version;
    var versionChanged;

    if ( previousVersion.testType === null ) {
      if ( noninteractive || !await booleanPrompt( `It appears that the last deployment was a production deployment (${previousVersion.toString()}).\nWould you like to redeploy (i.e. did the last production deploy fail for some reason?)`, false ) ) {
        grunt.fail.fatal( 'Aborted production deployment' );
      }

      version = previousVersion;
      versionChanged = false;
    }
    else if ( previousVersion.testType === 'rc' ) {
      version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance );
      versionChanged = true;
    }
    else {
      grunt.fail.fatal( 'Aborted production deployment since the version number cannot be incremented safely' );
    }

    const isFirstVersion = !( await simMetadata( {
      summary: true,
      simulation: repo
    } ).projects );

    // Initial deployment nags
    if ( isFirstVersion ) {
      if ( !await booleanPrompt( 'Is the master checklist complete (e.g. are screenshots added to assets, etc.)', noninteractive ) ) {
        grunt.fail.fatal( 'Aborted production deployment' );
      }
    }

    const versionString = version.toString();

    // caps-lock should hopefully shout this at people. do we have a text-to-speech synthesizer we can shout out of their speakers?
    // SECOND THOUGHT: this would be horrible during automated maintenance releases.
    if ( !await booleanPrompt( `DEPLOY ${versionString} to PRODUCTION`, noninteractive ) ) {
      grunt.fail.fatal( 'Aborted production deployment' );
    }

    if ( versionChanged ) {
      await setRepoVersion( repo, version );
      await gitPush( repo, branch );
    }

    // Make sure our correct npm dependencies are set
    await npmUpdate( repo );
    await npmUpdate( 'chipper' );

    // No special options required here, as we send the main request to the build server
    grunt.log.writeln( await build( repo, {
      brands
    } ) );

    if ( !await booleanPrompt( `Please test the built version of ${repo}.\nIs it ready to deploy`, noninteractive ) ) {
      // Abort version update
      if ( versionChanged ) {
        await setRepoVersion( repo, previousVersion );
        await gitPush( repo, branch );
      }

      // Abort checkout
      await checkoutMaster( repo, true );
      grunt.fail.fatal( 'Aborted production deployment (aborted version change too).' );
    }

    // Move over dependencies.json and commit/push
    await updateDependenciesJSON( repo, brands, versionString, branch );

    // Send the build request
    await buildServerRequest( repo, version, await getDependencies( repo ), {
      locales: '*',
      brands,
      servers: [ 'dev', 'production' ]
    } );

    // Move back to master
    await checkoutMaster( repo, true );

    if ( brands.includes( 'phet' ) ) {
      grunt.log.writeln( `Deployed: https://phet.colorado.edu/sims/html/${repo}/latest/${repo}_en.html` );
    }
    if ( brands.includes( 'phet-io' ) ) {
      grunt.log.writeln( `Deployed: https://phet-io.colorado.edu/sims/${repo}/${versionString}` );
    }

    grunt.log.writeln( 'Please test!' );

    if ( isFirstVersion && brands.includes( 'phet' ) ) {
      grunt.log.writeln( 'After testing, let the simulation lead know it has been deployed, so they can edit metadata on the website' );

      // Update the README on master
      grunt.log.writeln( 'Updating README' );
      await execute( gruntCommand, [ 'published-README' ], `../${repo}` );
      await gitAdd( repo, 'README.md' );
      try {
        await gitCommit( repo, `Generated published README.md as part of a production deploy for ${versionString}` );
        await gitPush( repo, 'master' );
      }
      catch ( e ) {
        grunt.log.writeln( 'Production README is already up-to-date' );
      }
    }

    // phet-io nags from the checklist
    if ( brands.includes( 'phet-io' ) ) {
      grunt.log.writeln( 'If this is a version that will be used with students, then make sure to remove the password protection.' );
      grunt.log.writeln( 'See https://github.com/phetsims/phet-io/blob/master/doc/phet-io-security.md for details.' );
      grunt.log.writeln( '' );
      grunt.log.writeln( 'Make sure that the current level of instrumentation is represented here in the Instrumentation Status Spreadsheet:' );
      grunt.log.writeln( 'https://docs.google.com/spreadsheets/d/1pU9izdNQkd9vr8TvLAfXe_v68yh-7potH-y712FBPr8/edit#gid=0' );
      grunt.log.writeln( 'MAKE SURE TO UPDATE THE "Latest Published Version" COLUMN.' );
      grunt.log.writeln( '' );
      grunt.log.writeln( 'If you are delivering this to a partner, update partners.md (phet-io/doc/partners.md) to show this delivery.' );
      grunt.log.writeln( 'Read the intro of the document to make sure that you format the entry correctly.' );
    }

    // Update the third-party-licenses report
    grunt.log.writeln( 'Running third-party report (do not ctrl-C it)' );
    await gitCheckout( 'chipper', '2.0' ); // TODO: MERGE: Remove this, we want to use master
    await execute( gruntCommand, [ 'report-third-party' ], '../chipper' );
    await gitCheckout( 'chipper', 'master' ); // TODO: MERGE: Remove this, we want to use master
    await gitAdd( 'sherpa', 'third-party-licenses.md' );
    try {
      await gitCommit( 'sherpa', `Updating third-party-licenses for deploy of ${repo} ${versionString}` );
      await gitPush( 'sherpa', 'master' );
    }
    catch ( e ) {
      grunt.log.writeln( 'Third party licenses are already up-to-date' );
    }
  }
  catch ( e ) {
    grunt.log.warn( 'Detected failure during deploy, reverting to master' );
    await checkoutMaster( repo, true );
    throw e;
  }
};
