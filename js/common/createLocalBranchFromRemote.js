// Copyright 2023, University of Colorado Boulder

/**
 * If your local repo does not have a remote branch, this script will grab it and set up tracking on it.
 * This script will start and end on the same, current branch the repo is on, but checkouts the `branch` param while
 * running.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */

const execute = require( './execute' );
const gitPull = require( './gitPull' );
const getBranch = require( './getBranch' );
const gitCheckout = require( './gitCheckout' );

/**
 * If your local repo does not have a remote branch, this script will grab it and set up tracking on it.
 * This script will start and end on the same, current branch the repo is on, but checkouts the `branch` param while
 * running.
 *
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The branch name
 * @returns {Promise<void>}
 */
module.exports = async function createLocalBranchFromRemote( repo, branch ) {
  const currentBranch = await getBranch( repo );
  await execute( 'git', [ 'checkout', '-b', branch, `origin/${branch}` ], `../${repo}` );
  await gitPull( repo );

  if ( branch !== '' ) { // otherwise it would fail
    await gitCheckout( repo, currentBranch );
  }
};
