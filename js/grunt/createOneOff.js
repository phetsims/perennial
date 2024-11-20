// Copyright 2017, University of Colorado Boulder

/**
 * For `grunt create-one-off`, see Gruntfile for details
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const SimVersion = require( '../common/SimVersion.js' ).default;
const build = require( '../common/build.js' );
const copyFile = require( '../common/copyFile.js' );
const execute = require( '../common/execute.js' ).default;
const getRepoVersion = require( '../common/getRepoVersion.js' );
const gitAdd = require( '../common/gitAdd.js' );
const gitCommit = require( '../common/gitCommit.js' );
const gitIsClean = require( '../common/gitIsClean.js' );
const gitPush = require( '../common/gitPush.js' );
const hasRemoteBranch = require( '../common/hasRemoteBranch.js' );
const npmUpdate = require( '../common/npmUpdate.js' );
const setRepoVersion = require( '../common/setRepoVersion.js' );
const grunt = require( 'grunt' );

/**
 * For `grunt create-one-off`, see Gruntfile for details
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The branch to create (should be {{MAJOR}}.{{MINOR}})
 * @param {string} [message] - Optional message to append to the version-increment commit.
 * @returns {Promise}
 */
module.exports = async function( repo, branch, message ) {
  const hasBranchAlready = await hasRemoteBranch( repo, branch );
  if ( hasBranchAlready ) {
    grunt.fail.fatal( 'Branch already exists, aborting' );
  }

  const branchedVersion = await getRepoVersion( repo );

  const newVersion = new SimVersion( branchedVersion.major, branchedVersion.minor, 0, {
    testType: branch,
    testNumber: 0
  } );

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot create release branch` );
  }

  // Create the branch, update the version info
  await execute( 'git', [ 'checkout', '-b', branch ], `../${repo}` );
  await setRepoVersion( repo, newVersion, message );
  await gitPush( repo, branch );

  // Update dependencies.json for the release branch
  await npmUpdate( repo );
  await npmUpdate( 'chipper' );
  await npmUpdate( 'perennial-alias' );

  const brand = 'phet';
  await build( repo, {
    brands: [ brand ]
  } );
  await copyFile( `../${repo}/build/${brand}/dependencies.json`, `../${repo}/dependencies.json` );
  await gitAdd( repo, 'dependencies.json' );
  await gitCommit( repo, `updated dependencies.json for version ${newVersion.toString()}` );
  await gitPush( repo, branch );
};