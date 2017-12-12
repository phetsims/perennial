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
const assert = require( 'assert' );
const build = require( '../common/build' );
const buildServerRequest = require( '../common/buildServerRequest' );
const checkoutMaster = require( '../common/checkoutMaster' );
const checkoutTarget = require( '../common/checkoutTarget' );
const execute = require( '../common/execute' );
const getDependencies = require( '../common/getDependencies' );
const getRepoVersion = require( '../common/getRepoVersion' );
const gitAdd = require( '../common/gitAdd' );
const gitCommit = require( '../common/gitCommit' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const grunt = require( 'grunt' );
const gruntCommand = require( '../common/gruntCommand' );
const hasRemoteBranch = require( '../common/hasRemoteBranch' );
const npmUpdate = require( '../common/npmUpdate' );
const prompt = require( '../common/prompt' );
const setRepoVersion = require( '../common/setRepoVersion' );
const SimVersion = require( '../common/SimVersion' );
const updateDependenciesJSON = require( '../common/updateDependenciesJSON' );

/**
 * Deploys a production version after incrementing the test version number.
 * @public
 *
 * TODO: remove a lot of the duplication with rc deployments! (rc.js)
 *
 * @param {string} repo
 * @param {string} branch
 * @param {Array.<string>} brands
 */
module.exports = async function( repo, branch, brands ) {
  const major = parseInt( branch.split( '.' )[ 0 ], 10 );
  const minor = parseInt( branch.split( '.' )[ 1 ], 10 );
  assert( major > 0, 'Major version for a branch should be greater than zero' );
  assert( minor >= 0, 'Minor version for a branch should be greater than (or equal) to zero' );

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    grunt.fail.fatal( `Unclean status in ${repo}, cannot create release branch` );
  }

  if ( !( await hasRemoteBranch( repo, branch ) ) ) {
    grunt.fail.fatal( `Cannot find release branch ${branch} for ${repo}` );
  }

  const creditsConfirmation = await prompt( 'Are QA credits up-to-date [Y/n]?' );
  if ( creditsConfirmation === 'n' ) {
    grunt.fail.fatal( 'Aborted production deployment' );
  }

  await checkoutTarget( repo, branch, true ); // include npm update

  const previousVersion = await getRepoVersion( repo );
  var version;
  var versionChanged;

  if ( previousVersion.testType === null ) {
    const redeployConfirmation = await prompt( `It appears that the last deployment was a production deployment (${previousVersion.toString()}).\nWould you like to redeploy (i.e. did the last production deploy fail for some reason?) [Y/n]?` );
    if ( redeployConfirmation === 'n' ) {
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

  const isFirstVersion = version.major === 1 && version.minor === 0 && version.maintenance === 0;

  // Initial deployment nags
  if ( isFirstVersion ) {
    const checklistConfirmation = await prompt( 'Is the master checklist complete (e.g. are screenshots added to assets, etc.) [Y/n]?' );
    if ( checklistConfirmation === 'n' ) {
      grunt.fail.fatal( 'Aborted production deployment' );
    }
  }

  // TODO: reduce this code duplication with dev.js
  const versionString = version.toString();

  // caps-lock should hopefully shout this at people. do we have a text-to-speech synthesizer we can shout out of their speakers?
  // SECOND THOUGHT: this would be horrible during automated maintenance releases.
  const initialConfirmation = await prompt( `DEPLOY ${versionString} to PRODUCTION [Y/n]?` );
  if ( initialConfirmation === 'n' ) {
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

  const postBuildConfirmation = await prompt( `Please test the built version of ${repo}.\nIs it ready to deploy [Y/n]?` );
  if ( postBuildConfirmation === 'n' ) {
    // Abort version update
    if ( versionChanged ) {
      await setRepoVersion( repo, previousVersion );
      await gitPush( repo, branch );
    }

    // Abort checkout
    await checkoutMaster( repo );
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
  await checkoutMaster( repo );

  if ( brands.includes( 'phet' ) ) {
    grunt.log.writeln( `Deployed: https://phet.colorado.edu/sims/html/${repo}/latest/${repo}_en.html` );
  }
  if ( brands.includes( 'phet-io' ) ) {
    // TODO: this should include the brand in the path, but double-check
    grunt.log.writeln( `Deployed: https://phet-io.colorado.edu/sims/${repo}/${versionString}` );
  }

  grunt.log.writeln( 'Please test!' );

  if ( isFirstVersion && brands.includes( 'phet' ) ) {
    grunt.log.writeln( 'After testing, let the simulation lead know it has been deployed, so they can edit metadata on the website' );

    // Update the README on master
    grunt.log.writeln( 'Updating README' );
    await execute( gruntCommand, [ 'published-README' ], `../${repo}` );
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
  await execute( gruntCommand, [ 'report-third-party' ], '../chipper' );
  await gitAdd( 'sherpa', 'third-party-licenses.md' );
  await gitCommit( 'sherpa', `Updating third-party-licenses for deploy of ${repo} ${versionString}` );
  await gitPush( 'sherpa', 'master' );
};
