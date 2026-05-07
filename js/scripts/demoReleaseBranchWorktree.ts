// Copyright 2026, University of Colorado Boulder

/**
 * Harness for testing the development of release branch worktrees.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import ReleaseBranch from '../common/ReleaseBranch.js';

( async () => {
  const releaseBranches = await ReleaseBranch.getAllMaintenanceBranches();

  const releaseBranch = releaseBranches.filter( rb => rb.repo === 'area-builder' )[ 0 ];

  console.log( `Testing out worktree for ${releaseBranch.repo} ${releaseBranch.branch}` );

  await releaseBranch.updateWorktree();
} )();