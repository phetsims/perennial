// Copyright 2017, University of Colorado Boulder

/**
 * For `grunt create-release`, see Gruntfile for details
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var assert = require( 'assert' );
var execute = require( '../common/execute' );
var gitCheckout = require( '../common/gitCheckout' );
var gitPush = require( '../common/gitPush' );
var setRepoVersion = require( '../common/setRepoVersion' );
var SimVersion = require( '../common/SimVersion' );

/**
 * For `grunt create-release`, see Gruntfile for details
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The branch to create (should be {{MAJOR}}.{{MINOR}})
 * @returns {Promise}
 */
module.exports = async function( repo, branch ) {
  var major = parseInt( branch.split( '.' )[ 0 ], 10 );
  var minor = parseInt( branch.split( '.' )[ 1 ], 10 );
  assert( major > 0, 'Major version for a branch should be greater than zero' );
  assert( minor >= 0, 'Minor version for a branch should be greater than (or equal) to zero' );

  // Create the branch, update the version info
  await execute( 'git', [ 'checkout', '-b', branch ], '../' + repo );
  await setRepoVersion( repo, new SimVersion( major, minor, 0, 'phet', {
    testType: 'rc',
    testNumber: 1
  } ) );
  await gitPush( repo, branch );

  // Update the version info in master
  await gitCheckout( repo, 'master' );
  await setRepoVersion( repo, new SimVersion( major, minor + 1, 0, 'phet', {
    testType: 'dev',
    testNumber: 0
  } ) );
  await gitPush( repo, 'master' );

  // Go back to the branch (as they may want to do a deploy)
  await gitCheckout( repo, branch );
};
