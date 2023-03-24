// Copyright 2023, University of Colorado Boulder

const protectGithubBranches = require( '../common/protectGithubBranches' );

/**
 * Remove branch protection rules for the provided repo so that master, main, and release CAN be modified.
 * It is faster to just remove branch protections from the github UI, but this is helpful for automation.
 * For example, you can use this if the automated maintenance release process needs to force push to
 * production branches.
 *
 * USAGE:
 * node perennial/js/scripts/clear-branch-protections-for-repo.js repository-name
 *
 * EXAMPLE:
 * node perennial/js/scripts/clear-branch-protections-for-repo.js john-travoltage
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */


const args = process.argv.slice( 2 );
const repo = args[ 0 ];

if ( !repo ) {
  console.error( 'Repo name must be provided as first command line argument.' );
}
else {
  ( async () => {
    await protectGithubBranches.clearBranchProtections( [ repo ] );
  } )();
}