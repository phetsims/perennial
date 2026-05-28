// Copyright 2021-2026, University of Colorado Boulder

const protectGithubBranches = require( '../common/protectGithubBranches' );

/**
 * Set branch protection rules for the provided repo so that main, and release branches cannot be deleted.
 *
 * USAGE:
 * sage run perennial/js/scripts/protect-branches-for-repo.js repository-name
 *
 * EXAMPLE:
 * sage run perennial/js/scripts/protect-branches-for-repo.js john-travoltage
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

// TODO: not ported to totality, see https://github.com/phetsims/totality/issues/140
// eslint-disable
// @ts-nocheck

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