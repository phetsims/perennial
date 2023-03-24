// Copyright 2021, University of Colorado Boulder

/**
 * Applies or updates branch protection rules for all active repos.
 *
 * USAGE:
 * node perennial/js/scripts/protect-branches-in-all-repos.js
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

const protectGithubBranches = require( '../common/protectGithubBranches' );
const fs = require( 'fs' );

// cannot use getActiveRepos() from root
const contents = fs.readFileSync( 'perennial/data/active-repos', 'utf8' ).trim();
const activeRepos = contents.split( '\n' ).map( sim => sim.trim() );

// perennial-alias is an exception, it is just a clone of the perennial repository
if ( activeRepos.includes( 'perennial-alias' ) ) {
  activeRepos.splice( activeRepos.indexOf( 'perennial-alias' ), 1 );
}

// so that execution doesn't finish until githubProtectBranches resolves
( async () => {
  await protectGithubBranches.protectBranches( activeRepos );
} )();
