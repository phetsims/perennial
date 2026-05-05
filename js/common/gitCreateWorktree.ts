// Copyright 2026, University of Colorado Boulder

/**
 * Creates a worktree for the given branch (or SHA, if detach:true is provided)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

const execute = require( './execute' ).default;

export type GitCreateWorktreeOptions = {
  // If a SHA is provided, detach: true should be provided so that it creates a detached worktree
  detach: boolean;
};

export const gitCreateWorktree = async (
  worktreeDirectory: string,
  branchOrSha: string,
  options?: GitCreateWorktreeOptions
): Promise<void> => {
  const detach = options?.detach ?? false;

  return execute( 'git', [
    'worktree',
    'add',
    ...( detach ? [ '--detach' ] : [] ),
    worktreeDirectory,
    branchOrSha
  ], '.' );
};
