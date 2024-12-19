// Copyright 2023-2024, University of Colorado Boulder

/**
 * Wait. Stop. Why do you want to remove the protection rules? Bad things often happen when you want to remove '
 * these. Do you want to delete a release branch? That is probably a bad idea. Maybe just merge main/ into your release '
 * branch. Paper trail about some of the unforeseen troubles can be found here: https://github.com/phetsims/perennial/issues/351
 * Also know that you can set a package flag, "ignoreForAutomatedMaintenanceReleases" to "ditch" a release branch forever.
 *
 * Remove branch protection rules for the provided repo so that main, and release CAN be modified.
 * It is faster to just remove branch protections from the github UI, but this is helpful for automation.
 * For example, you can use this if the automated maintenance release process needs to force push to
 * production branches.
 *
 * USAGE:
 * sage run perennial/js/scripts/clear-branch-protections-for-repo.js repository-name
 *
 * EXAMPLE:
 * sage run perennial/js/scripts/clear-branch-protections-for-repo.js john-travoltage
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

const protectGithubBranches = require( '../common/protectGithubBranches' );

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