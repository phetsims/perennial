// Copyright 2026, University of Colorado Boulder

/**
 * Creates a worktree for the given branch (or SHA, if detach:true is provided)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitMutableExecute } from './gitMutex.js';

export type GitCreateWorktreeOptions = {
  // If a SHA is provided, detach: true should be provided so that it creates a detached worktree
  detach: boolean;
};

export const gitCreateWorktree = async (
  worktreeDirectory: string,
  branchOrSha: string,
  options?: GitCreateWorktreeOptions
): Promise<string> => {
  const detach = options?.detach ?? false;

  return gitMutableExecute( [
    'worktree',
    'add',
    ...( detach ? [ '--detach' ] : [] ),
    worktreeDirectory,
    branchOrSha
  ], '.' );
};
