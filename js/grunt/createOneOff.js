// Copyright 2017, University of Colorado Boulder

/**
 * For `grunt create-one-off`, see Gruntfile for details
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const SimVersion = require( '../browser-and-node/SimVersion' ).default;
const build = require( '../common/build' );
const copyFile = require( '../common/copyFile' );
const execute = require( '../common/execute' ).default;
const getRepoVersion = require( '../common/getRepoVersion' );
const gitAdd = require( '../common/gitAdd' );
const gitCommit = require( '../common/gitCommit' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const hasRemoteBranch = require( '../common/hasRemoteBranch' );
const npmUpdate = require( '../common/npmUpdate' );
const setRepoVersion = require( '../common/setRepoVersion' );

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

    // Comment this line out if you know, because you just created the branch on accident.
    throw new Error( 'Branch already exists, aborting' );
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

  const checkoutArgs = [ 'checkout' ];
  !hasBranchAlready && checkoutArgs.push( '-b' );
  checkoutArgs.push( branch );

  // Create the branch, update the version info
  await execute( 'git', checkoutArgs, `../${repo}` );
  await setRepoVersion( repo, newVersion, message );
  await gitPush( repo, branch );

  // Update dependencies.json for the release branch
  await npmUpdate( repo );
  await npmUpdate( 'chipper' );
  await npmUpdate( 'perennial-alias' );

  const brand = 'phet';
  await build( repo, {
    brands: [ brand ],

    // We just need the dependencies.json generated.
    minify: false,
    lint: false,
    typeCheck: false
  } );
  await copyFile( `../${repo}/build/${brand}/dependencies.json`, `../${repo}/dependencies.json` );
  if ( !await gitIsClean( repo ) ) {
    await gitAdd( repo, 'dependencies.json' );
    await gitCommit( repo, `updated dependencies.json for version ${newVersion.toString()}` );
  }
  await gitPush( repo, branch );
};