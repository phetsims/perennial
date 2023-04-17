// Copyright 2017, University of Colorado Boulder

/**
 * For `grunt create-release`, see Gruntfile for details
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const SimVersion = require( '../common/SimVersion' );
const build = require( '../common/build' );
const copyFile = require( '../common/copyFile' );
const getBranch = require( '../common/getBranch' );
const gitAdd = require( '../common/gitAdd' );
const gitCheckout = require( '../common/gitCheckout' );
const gitCommit = require( '../common/gitCommit' );
const gitCreateBranch = require( '../common/gitCreateBranch' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPush = require( '../common/gitPush' );
const hasRemoteBranch = require( '../common/hasRemoteBranch' );
const npmUpdate = require( '../common/npmUpdate' );
const setRepoVersion = require( '../common/setRepoVersion' );
const setRepoSupportedBrands = require( '../common/setRepoSupportedBrands' );
const updateHTMLVersion = require( '../common/updateHTMLVersion' );
const assert = require( 'assert' );
const grunt = require( 'grunt' );
const winston = require( 'winston' );

/**
 * For `grunt create-release`, see Gruntfile for details
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The branch to create (should be {{MAJOR}}.{{MINOR}})
 * @param {string[]} brands - the supported brands in the release
 * @param {string} [message] - Optional message to append to the brands/version-increment commit.
 * @returns {Promise}
 */
module.exports = async function createRelease( repo, branch, brands, message ) {
  const major = Number( branch.split( '.' )[ 0 ] );
  const minor = Number( branch.split( '.' )[ 1 ] );
  assert( major > 0, 'Major version for a branch should be greater than zero' );
  assert( minor >= 0, 'Minor version for a branch should be greater than (or equal) to zero' );

  assert( Array.isArray( brands ), 'supported brands required' );
  assert( brands.length >= 1, 'must have a supported brand' );

  const currentBranch = await getBranch( repo );
  if ( currentBranch !== 'master' ) {
    grunt.fail.fatal( `Should be on master to create a release branch, not: ${currentBranch ? currentBranch : '(detached head)'}` );
  }

  const hasBranchAlready = await hasRemoteBranch( repo, branch );
  if ( hasBranchAlready ) {
    grunt.fail.fatal( 'Branch already exists, aborting' );
  }

  const newVersion = new SimVersion( major, minor, 0, {
    testType: 'rc',
    testNumber: 0
  } );

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot create release branch` );
  }

  winston.info( 'Setting the release branch version to rc.0 so it will auto-increment to rc.1 for the first RC deployment' );

  // Create the branch, update the version info
  await gitCreateBranch( repo, branch );
  await setRepoSupportedBrands( repo, brands );
  await setRepoVersion( repo, newVersion, message );
  await gitPush( repo, branch );

  // Update dependencies.json for the release branch
  await npmUpdate( repo );
  await npmUpdate( 'chipper' );
  await npmUpdate( 'perennial-alias' );

  const brand = brands[ 0 ];
  await build( repo, {
    brands: [ brand ]
  } );
  await copyFile( `../${repo}/build/${brand}/dependencies.json`, `../${repo}/dependencies.json` );
  await gitAdd( repo, 'dependencies.json' );
  await gitCommit( repo, `updated dependencies.json for version ${newVersion.toString()}` );
  await gitPush( repo, branch );

  // Update the version info in master
  await gitCheckout( repo, 'master' );
  await setRepoVersion( repo, new SimVersion( major, minor + 1, 0, {
    testType: 'dev',
    testNumber: 0
  } ), message );
  await updateHTMLVersion( repo );
  await gitPush( repo, 'master' );

  // Go back to the branch (as they may want to do a deploy)
  await gitCheckout( repo, branch );
};
