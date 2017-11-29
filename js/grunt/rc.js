// Copyright 2017, University of Colorado Boulder

/**
 * Deploys a dev version after incrementing the test version number.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line
const createRelease = require( './createRelease' );
// const getRepoVersion = require( '../common/getRepoVersion' );
const gitIsClean = require( '../common/gitIsClean' );
const gitCheckoutTarget = require( '../common/gitCheckoutTarget' );
const hasRemoteBranch = require( '../common/hasRemoteBranch' );
const prompt = require( '../common/prompt' );

/**
 * Deploys a dev version after incrementing the test version number.
 * @public
 *
 * @param {Object} grunt
 * @param {string} repo
 * @param {string} branch
 */
module.exports = async function( grunt, repo, branch ) {
  // TODO: does this happen for multiple brands?

  const major = parseInt( branch.split( '.' )[ 0 ], 10 );
  const minor = parseInt( branch.split( '.' )[ 1 ], 10 );
  assert( major > 0, 'Major version for a branch should be greater than zero' );
  assert( minor >= 0, 'Minor version for a branch should be greater than (or equal) to zero' );

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    grunt.fail.fatal( `Unclean status in ${repo}, cannot create release branch` );
  }

  if ( !( await hasRemoteBranch( repo, branch ) ) ) {
    const createBranchConfirmation = await prompt( `Release branch ${branch} does not exist. Create it? [Y/n]?` );
    if ( createBranchConfirmation === 'n' ) {
      grunt.fail.fatal( 'Aborted rc deploy due to non-existing branch' );
    }

    await createRelease( grunt, repo, branch );
  }

  await gitCheckoutTarget( repo, branch, true ); // include npm update

  // const previousVersion = getRepoVersion( repo );
};
