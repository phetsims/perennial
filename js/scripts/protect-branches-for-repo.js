// Copyright 2021, University of Colorado Boulder

const protectGithubBranches = require( '../common/protectGithubBranches' );

/**
 * Set branch protection rules for the provided repo so that master, main, and release branches cannot be deleted.
 *
 * USAGE:
 * node perennial/js/scripts/protect-branches-for-repo.js repository-name
 *
 * EXAMPLE:
 * node perennial/js/scripts/protect-branches-for-repo.js john-travoltage
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
    await protectGithubBranches.protectBranches( [ repo ] );
  } )();
}