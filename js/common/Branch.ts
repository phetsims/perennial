// Copyright 2026, University of Colorado Boulder

/**
 * Represents a branch (whether a release or feature branch)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import buildLocal from './buildLocal';
import createDirectory from './createDirectory';
import path from 'path';

export const WORKTREE_DIRECTORY = buildLocal.releaseBranchesDirectory;

export class Branch {
  public constructor(
    // TODO: rename to `branch` once we get things more refactored
    public readonly totalityBranch: string
  ) {

  }

  public getWorktreeDirectory(): string {
    return Branch.getWorktreeDirectory( this.totalityBranch );
  }

  /**
   * Ensure that the parent directory of the worktree exists. Since the worktree directory can include slashes which
   * create nested directories, we will need to create UP TO the last directory, but not including the last directory
   * (since that will be created by git worktree add).
   */
  public async ensureWorktreeParentDirectory(): Promise<void> {
    // Don't create the full worktree directory, since that will be created by git worktree add
    await createDirectory( path.dirname( this.getWorktreeDirectory() ) );
  }

  public static getWorktreeDirectory( totalityBranch: string ): string {
    return `${WORKTREE_DIRECTORY}/${totalityBranch}`;
  }
}