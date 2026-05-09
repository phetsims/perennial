// Copyright 2026, University of Colorado Boulder

/**
 * Represents a checked out (either main copy or worktree)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { buildLocal } from './buildLocal';
import { createDirectory } from './createDirectory';
import path from 'path';
import { createLocalBranchFromRemote } from './createLocalBranchFromRemote.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { gitCreateWorktree } from './gitCreateWorktree.js';
import { gitPullDirectory } from './gitPullDirectory.js';
import execute from './execute.js';
import { npmUpdateDirectory } from './npmUpdateDirectory.js';
import ReleaseBranch from './ReleaseBranch.js';
import { getBranch } from './getBranch.js';

export const WORKTREE_DIRECTORY = buildLocal.releaseBranchesDirectory;

export class Branch {

  public constructor(
    // TODO: rename to `branch` once we get things more refactored
    public readonly totalityBranch: string,

    // The release branch that this branch is for, or null if this is a branch that doesn't have a specific repo (main!!)
    public readonly releaseBranch: ReleaseBranch | null
  ) {
    if ( !!( releaseBranch ) !== ( totalityBranch !== 'main' ) ) {
      throw new Error( `totalityBranch ${totalityBranch} and releaseBranch ${releaseBranch} are not consistent` );
    }
  }

  public getWorkingDirectory(): string {
    // TODO: verify that we are on 'main' for all of our operations that would need to do this?
    return this.totalityBranch === 'main' ? '..' : Branch.getWorktreeDirectory( this.totalityBranch );
  }

  public async update(): Promise<void> {
    if ( this.releaseBranch ) {
      winston.info( `updating worktree for ${this.toString()}` );

      // Create the container directory
      await this.ensureWorktreeParentDirectory();

      const worktreeDirectory = this.getWorkingDirectory();

      // Ensure our remote tracking is set up properly
      await createLocalBranchFromRemote( this.totalityBranch );

      // Create the worktree itself if needed
      if ( !fs.existsSync( worktreeDirectory ) ) {
        winston.info( `creating worktree at ${worktreeDirectory}` );
        await gitCreateWorktree( worktreeDirectory, this.totalityBranch );
      }
      else {
        winston.info( `pulling worktree at ${worktreeDirectory}` );
        await gitPullDirectory( worktreeDirectory );
      }

      if ( fs.existsSync( `${worktreeDirectory}/babel` ) ) {
        winston.info( 'pulling babel in worktree' );
        await execute( 'git', [ 'pull' ], `${worktreeDirectory}/babel` );
      }
      else {
        winston.info( 'cloning babel into worktree' );
        await execute( 'git', [ 'clone', 'https://github.com/phetsims/babel.git' ], worktreeDirectory );
      }

      for ( const npmRepo of [ 'chipper', 'perennial-alias', this.releaseBranch.repo ] ) {
        if ( fs.existsSync( `${worktreeDirectory}/${npmRepo}` ) ) {
          winston.info( `npm update ${npmRepo} in worktree` );
          await npmUpdateDirectory( `${worktreeDirectory}/${npmRepo}` );
        }
      }
    }
    else {
      // Ensure we are on main!
      const branch = await getBranch();

      if ( branch !== 'main' ) {
        throw new Error( `Expected to be on main, but got ${branch}` );
      }
    }
  }

  /**
   * Ensure that the parent directory of the worktree exists. Since the worktree directory can include slashes which
   * create nested directories, we will need to create UP TO the last directory, but not including the last directory
   * (since that will be created by git worktree add).
   */
  public async ensureWorktreeParentDirectory(): Promise<void> {
    // Don't create the full worktree directory, since that will be created by git worktree add
    await createDirectory( path.dirname( this.getWorkingDirectory() ) );
  }

  public static getWorktreeDirectory( totalityBranch: string ): string {
    return `${WORKTREE_DIRECTORY}/${totalityBranch}`;
  }
}