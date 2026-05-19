// Copyright 2026, University of Colorado Boulder

/**
 * Represents a checked out (either main copy or worktree)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { buildLocal } from './buildLocal.js';
import { createDirectory } from './createDirectory.js';
import path from 'path';
import { ensureLocalBranchFromRemote } from './ensureLocalBranchFromRemote.js';
import fs from 'fs';
// eslint-disable-next-line phet/default-import-match-filename
import fsPromises from 'fs/promises';
import { gitCreateWorktree } from './gitCreateWorktree.js';
import { gitPullDirectory } from './gitPullDirectory.js';
import execute from './execute.js';
import { npmUpdateDirectory, NPMUpdateOptions } from './npmUpdateDirectory.js';
import { ReleaseBranch } from './ReleaseBranch.js';
import { getBranchBrands } from './getBranchBrands.js';
import { ChipperVersion } from './ChipperVersion.js';
import { getFileAtBranch } from './getFileAtBranch.js';
import { gitIsAncestor } from './gitIsAncestor.js';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';
import { gitFirstDivergingCommit } from './gitFirstDivergingCommit.js';
import { gitTimestamp } from './gitTimestamp.js';
import { gitRevParse } from './gitRevParse.js';
import simMetadata, { SimMetadata } from './simMetadata.js';
import simPhetioMetadata, { SimPhetioMetadata } from './simPhetioMetadata.js';
import { getActiveSims } from './getActiveSims.js';
import { getBranches } from './getBranches.js';
import os from 'os';
import { Branch, BranchOrSHA, IntentionalPerennialAny, LegacyBranch, Repo, SHA } from '../browser-and-node/PerennialTypes.js';
import assert from 'assert';
import { getBranch } from './getBranch.js';
import { hasRemoteBranch } from './hasRemoteBranch.js';
import SimVersion from '../browser-and-node/SimVersion.js';
import { gitIsClean } from './gitIsClean.js';
import { RunnableBranch } from './RunnableBranch.js';
import { getBranchSimVersion } from './getBranchSimVersion.js';
import { getActiveRunnables } from './getActiveRunnables.js';
import { tsxCommand } from './tsxCommand.js';
import pLimit from 'p-limit';
import { gitImmutableExecute, gitMutableExecute } from './gitMutex.js';
import { escapeRegExp } from './escapeRegExp.js';

export const WORKTREE_DIRECTORY = buildLocal.worktreesDirectory;
export const MAINTENANCE_WORKTREE_DIRECTORY = buildLocal.maintenanceWorktreeDirectory;

// Let this data be cached so we don't need to re-request all the time (and share the requests when many things are made at once)
let simMetadataPromise!: Promise<SimMetadata>;
let simPhetioMetadataPromise!: Promise<SimPhetioMetadata[]>;
export const invalidateMetadataCache = (): void => {
  winston.debug( 'loading phet brand ReleaseBranches' );
  simMetadataPromise = simMetadata( {
    type: 'html'
  } );
  winston.debug( 'loading phet-io brand ReleaseBranches' );
  simPhetioMetadataPromise = simPhetioMetadata( {
    active: true,
    latest: true
  } );
};
invalidateMetadataCache();

export class Checkout {

  // If this is for a ReleaseBranch, this will store a reference to the ReleaseBranch.
  public releaseBranch: ReleaseBranch | null = null;

  // Whether the "branch" is a SHA (modeled as a detached HEAD)
  public readonly isSHA: boolean;

  // This is used a lot, and expensive to calculate, so we will cache it here.
  private cachedDivergingSHA: SHA | null = null;

  // Protected so we can do async initialization in static methods
  protected constructor(
    // The fully-qualified branch name of this checkout (e.g. "releases/acid-base-solutions/1.0", "main"), OR
    // a full SHA if it is a detached head checkout (e.g. "8bf98524a904c9ad10aaad7441f77e88d0ec199d")
    // TODO: support pull requests, `git ls-remote` mentions things like refs/pull/87/head, see https://github.com/phetsims/totality/issues/140
    // TODO: actually, don't allow this due to security? https://github.com/phetsims/totality/issues/140
    public readonly branch: BranchOrSHA,

    // Whether it is our primary "checkout" (where we are being run from, i.e. '..'). If false, this is a worktree checkout
    public readonly isPrimary: boolean,

    // Whether this is our secondary "maintenance" worktree, to use for editing release branches and such.
    public readonly isMaintenance: boolean,

    // The working directory for the base of this checkout
    public readonly workingDirectory: string,

    // Whether we are actually checked out. We can still get information from non-checked-out shas/branches, but certain
    // operations will be unavailable.
    // Will be mutated to true on a checkout. We need to track that for various operations.
    public isCheckedOut: boolean
  ) {
    this.isSHA = /^[0-9a-fA-F]{40}$/.test( branch );

    if ( isPrimary !== ( workingDirectory === '..' ) ) {
      throw new Error( `Expected isPrimary (${isPrimary}) to match workingDirectory (${workingDirectory}) for branch ${branch}` );
    }

    if ( isPrimary && !isCheckedOut ) {
      throw new Error( `Expected primary checkout to be checked out, but it is not for branch ${branch}` );
    }

    if ( !isPrimary && branch === 'main' ) {
      throw new Error( 'Should not be creating a non-primary checkout for main branch' );
    }
  }

  public static async hasWorktree( branch: BranchOrSHA ): Promise<boolean> {
    if ( branch === 'main' ) {
      throw new Error( 'Should not be checking for a worktree for main branch' );
    }

    const worktreeData = await gitImmutableExecute( [
      'worktree',
      'list',
      '--porcelain'
    ], '..' );

    return new RegExp(
      `^(?:branch refs/heads/${escapeRegExp( branch )}|HEAD ${escapeRegExp( branch )})$`,
      'm'
    ).test( worktreeData );
  }

  public static async getCurrentPrimaryCheckout(): Promise<Checkout> {
    let branchOrSHA = await getBranch();

    if ( !branchOrSHA ) {
      branchOrSHA = await gitRevParse( 'HEAD' );
    }

    return Checkout.getGenericBranchCheckout( branchOrSHA, true );
  }

  public static async getMainCheckout(): Promise<Checkout> {
    return new Checkout( 'main', true, false, '..', true );
  }

  /**
   * NOTE: BE CAREFUL, this is set as isCheckedOut: true. Code using this should keep it on the branch
   * while it is in scope
   */
  public static async getOneOffCheckout( branch: Branch ): Promise<Checkout> {
    return new Checkout( branch, true, false, '..', true );
  }

  public static async getGenericBranchCheckout( branch: BranchOrSHA, isPrimary = false ): Promise<Checkout> {
    const directoryExists = isPrimary ? true : fs.existsSync( Checkout.getWorktreeDirectory( branch ) );
    const worktreeExists = isPrimary ? true : await Checkout.hasWorktree( branch );

    if ( directoryExists !== worktreeExists ) {
      throw new Error( `Expected worktree existence (${worktreeExists}) to match directory existence (${directoryExists}) for ${branch}` );
    }

    return new Checkout( branch, isPrimary, false, isPrimary ? '..' : Checkout.getWorktreeDirectory( branch ), worktreeExists );
  }

  public static async getMaintenanceCheckout( branchOrSHA: BranchOrSHA ): Promise<Checkout> {
    // TODO: Must be manually created right now, fix that (!) https://github.com/phetsims/totality/issues/140

    return new Checkout( branchOrSHA, false, true, MAINTENANCE_WORKTREE_DIRECTORY, true );
  }

  public static async getReleaseBranchCheckout( repo: Repo, legacyBranch: LegacyBranch ): Promise<Checkout> {
    winston.debug( `getting release branch checkout for ${repo} ${legacyBranch}` );

    const branch = Checkout.getReleaseBranchName( repo, legacyBranch );
    const workingDirectory = Checkout.getWorktreeDirectory( branch );

    const directoryExists = fs.existsSync( workingDirectory );
    const worktreeExists = await Checkout.hasWorktree( branch );

    if ( directoryExists !== worktreeExists ) {
      throw new Error( `Expected worktree existence (${worktreeExists}) to match directory existence (${directoryExists}) for ${branch}` );
    }

    const checkout = new Checkout( branch, false, false, workingDirectory, worktreeExists );

    const simVersion = await getBranchSimVersion( repo, branch );

    const supportedBrands = await getBranchBrands( repo, branch );

    const includePublishedPhetBrand = ( await simMetadataPromise ).projects.some( simData => {
      const releaseRepo = simData.name.slice( simData.name.indexOf( '/' ) + 1 );
      const releaseBranch = `${simData.version.major}.${simData.version.minor}`;

      return releaseRepo === repo && releaseBranch === legacyBranch;
    } );

    const includePublishedPhetioBrand = ( await simPhetioMetadataPromise ).some( simData => {
      if ( !simData.active || !simData.latest ) {
        return false;
      }

      const releaseRepo = simData.name;
      let releaseBranch = `${simData.versionMajor}.${simData.versionMinor}`;
      if ( simData.versionSuffix.length ) {
        releaseBranch += `-${simData.versionSuffix}`; // additional dash required
      }

      return releaseRepo === repo && releaseBranch === legacyBranch;
    } );

    let isReleased = simVersion.isSimPublished;

    if ( simVersion.isSimPublished && !includePublishedPhetBrand && !includePublishedPhetioBrand ) {
      // Marking an unreleased sim
      isReleased = false;
    }
    if ( !simVersion.isSimPublished && ( includePublishedPhetBrand || includePublishedPhetioBrand ) ) {
      throw new Error( `Expected unpublished sim ${repo} ${legacyBranch} to not be included in metadata, but it was` );
    }

    let brands: string[];
    if ( simVersion.isSimPublished ) {
      brands = [
        ...( includePublishedPhetBrand ? [ 'phet' ] : [] ),
        ...( includePublishedPhetioBrand ? [ 'phet-io' ] : [] )
      ];
    }
    else {
      brands = [
        // phet-brand always include for presumed unreleased branch
        'phet',
        ...( supportedBrands.includes( 'phet-io' ) ? [ 'phet-io' ] : [] )
      ];
    }

    if ( brands.some( brand => !supportedBrands.includes( brand ) ) ) {
      throw new Error( `Expected supported brands ${supportedBrands.join( ', ' )} on branch ${repo} ${legacyBranch} to include all of the published brands ${brands.join( ', ' )}` );
    }

    checkout.releaseBranch = new ReleaseBranch( checkout, repo, legacyBranch, brands, isReleased );

    return checkout;
  }

  public static async getReleaseBranch( repo: Repo, legacyBranch: LegacyBranch ): Promise<ReleaseBranch> {
    const checkout = await Checkout.getReleaseBranchCheckout( repo, legacyBranch );

    if ( !checkout.releaseBranch ) {
      throw new Error( `Expected release branch to be set for ${checkout.branch}` );
    }

    return checkout.releaseBranch;
  }

  public static async getMainRunnableBranch( repo: Repo ): Promise<RunnableBranch> {
    return ( await Checkout.getMainCheckout() ).getRunnableBranch( repo );
  }

  public static async getCurrentPrimaryRunnableBranch( repo: Repo ): Promise<RunnableBranch> {
    return ( await Checkout.getCurrentPrimaryCheckout() ).getRunnableBranch( repo );
  }

  public static getReleaseBranchName( repo: Repo, legacyBranch: LegacyBranch ): Branch {
    if ( legacyBranch.startsWith( 'releases/' ) ) {
      throw new Error( `Expected legacy branch to not start with releases/, got: ${legacyBranch}` );
    }

    return `releases/${repo}/${legacyBranch}`;
  }

  public static getWorktreeDirectory( branch: BranchOrSHA ): string {
    if ( branch === 'main' ) {
      throw new Error( 'Should not be getting a worktree directory for main branch' );
    }

    // TODO: do we need escaping at all, if one branch is a substring of another? (e.g. feature/foo, feature/foo/bar) https://github.com/phetsims/totality/issues/140
    return `${WORKTREE_DIRECTORY}/${branch}`;
  }

  public static async createReleaseBranchCheckout(
    repo: Repo,
    legacyBranch: LegacyBranch,
    brands: string[],
    message?: string // appended to the commit message for the initial release branch commit, if provided
  ): Promise<Checkout> {
    const branch = Checkout.getReleaseBranchName( repo, legacyBranch );

    const major = Number( legacyBranch.split( '.' )[ 0 ] );
    const minor = Number( legacyBranch.split( '.' )[ 1 ] );
    assert( major > 0, 'Major version for a branch should be greater than zero' );
    assert( minor >= 0, 'Minor version for a branch should be greater than (or equal) to zero' );

    assert( Array.isArray( brands ), 'supported brands required' );
    assert( brands.length >= 1, 'must have a supported brand' );

    const currentBranch = await getBranch();
    if ( currentBranch !== 'main' ) {
      throw new Error( `Should be on main to create a release branch, not: ${currentBranch ? currentBranch : '(detached head)'}` );
    }

    const hasBranchAlready = await hasRemoteBranch( branch );
    if ( hasBranchAlready ) {
      throw new Error( 'Branch already exists, aborting' );
    }

    winston.info( 'Setting the release branch version to rc.0 so it will auto-increment to rc.1 for the first RC deployment' );
    const newVersion = new SimVersion( major, minor, 0, {
      testType: 'rc',
      testNumber: 0
    } );

    const isClean = await gitIsClean();
    if ( !isClean ) {
      throw new Error( 'Unclean status, cannot create release branch' );
    }

    const checkout = new Checkout( branch, false, false, Checkout.getWorktreeDirectory( branch ), false );

    // get dependencies from main
    const dependencies = await ( await checkout.getRunnableBranch( repo ) ).getDependencies();

    const releaseBranch = new ReleaseBranch( checkout, repo, legacyBranch, brands, false );
    checkout.releaseBranch = releaseBranch;

    winston.info( `Creating branch ${branch}` );

    // Create the branch in git, and push it directly (not using the other helpers, since we are doing this from the MAIN directory)
    await gitMutableExecute( [ 'checkout', '-b', branch ], '..' );
    await gitMutableExecute( [ 'push', '-u', 'origin', branch ], '..' ); // not using this.gitPush, since this is our first
    await gitMutableExecute( [ 'checkout', 'main' ], '..' );

    // Ensure that we are remotely tracked now (sanity check)
    await ensureLocalBranchFromRemote( branch );

    // Ensure we have a checkout (so we can modify and push from that region).
    await checkout.updateWorktree();

    // Remove everything except for dependencies, '.git' (so our worktree works), and babel (since we just directly checked it out)
    const topLevelFilesToRemove = ( await fsPromises.readdir( checkout.workingDirectory ) ).filter( file => {
      return !dependencies.includes( file ) && file !== 'git' && file !== 'babel';
    } );
    for ( const file of topLevelFilesToRemove ) {
      winston.info( `Removing ${file} from release branch worktree` );

      await fsPromises.rm( `${checkout.workingDirectory}/${file}`, { recursive: true, force: true } );
    }

    // Add in a minimal .gitignore
    await fsPromises.writeFile( `${checkout.workingDirectory}/.gitignore`, `/babel/${os.EOL}.DS_Store${os.EOL}` );

    await checkout.gitAddAll();
    await checkout.gitCommit( `Initial commit for release branch ${branch}${message ? `: ${message}` : ''}` );
    await checkout.gitPush();

    // Update the version info (will push)
    await releaseBranch.setSupportedBrands( brands );
    await releaseBranch.setSimVersion( newVersion, message );

    // Update the version info in main
    const mainRunnableBranch = await Checkout.getMainRunnableBranch( repo );
    await mainRunnableBranch.checkout.gitPullRebase();
    await mainRunnableBranch.setSimVersion( new SimVersion( major, minor + 1, 0, {
      testType: 'dev',
      testNumber: 0
    } ), message );
    await mainRunnableBranch.updateHTMLVersion();

    return checkout;
  }

  /**
   * Gets a list of ReleaseBranches which would be potential candidates for a maintenance release. This includes:
   * - All published phet brand release branches (from metadata)
   * - All published phet-io brand release branches (from metadata)
   * - All unpublished local release branches
   *
   * @rejects {ExecuteError}
   */
  public static async getMaintainedReleaseBranches( unreleased = true ): Promise<ReleaseBranch[]> {
    winston.info( `Getting maintained release branches (unreleased: ${unreleased})` );

    type Stub = { repo: Repo; branch: LegacyBranch };

    const stubs: Stub[] = [];
    const hasStub = ( repo: Repo, branch: LegacyBranch ): boolean => {
      return stubs.some( stub => stub.repo === repo && stub.branch === branch );
    };
    const addStub = ( repo: Repo, branch: LegacyBranch ): void => {
      // FAMB 2.3-phetio keeps ending up in the MR list when we don't want it to, see https://github.com/phetsims/phet-io/issues/1957.
      if ( repo === 'forces-and-motion-basics' && branch === '2.3-phetio' ) {
        return;
      }

      // Performance hopefully not a concern
      if ( !hasStub( repo, branch ) ) {
        stubs.push( { repo: repo, branch: branch } );
      }
    };

    // phet metadata
    for ( const simData of ( await simMetadataPromise ).projects ) {
      const repo = simData.name.slice( simData.name.indexOf( '/' ) + 1 );
      const branch = `${simData.version.major}.${simData.version.minor}`;

      addStub( repo, branch );
    }

    // phet-io metadata
    for ( const simData of ( await simPhetioMetadataPromise ) ) {
      if ( !simData.active || !simData.latest ) {
        continue;
      }

      const repo = simData.name;
      let branch = `${simData.versionMajor}.${simData.versionMinor}`;
      if ( simData.versionSuffix.length ) {
        branch += `-${simData.versionSuffix}`; // additional dash required
      }

      addStub( repo, branch );
    }

    // unreleased branches (might pick up duplicate stubs, that is fine)
    if ( unreleased ) {
      const activeSims = getActiveSims();
      for ( const totalityBranch of await getBranches() ) {
        const match = totalityBranch.match( /^releases\/([^/]+)\/(\d+)\.(\d+)$/ );

        // Ignore all of the other branches
        if ( !match ) {
          continue;
        }

        const repo = match[ 1 ];
        const major = Number( match[ 2 ] );
        const minor = Number( match[ 3 ] );
        const branch = `${major}.${minor}`;


        if ( repo === 'chains' ) {
          continue; // chains was used as a special case, so we need to ignore those for now
        }

        // Only look for active sim repos
        if ( !activeSims.includes( repo ) ) {
          continue;
        }

        if ( hasStub( repo, branch ) ) {
          continue;
        }

        // Assumption that there is no phet-io brand sim that isn't also released with phet brand
        const projectMetadata = ( await simMetadataPromise ).projects.find( project => project.name === `html/${repo}` ) || null;
        const productionVersion = projectMetadata ? projectMetadata.version : null;

        if (
          !productionVersion ||
          major > productionVersion.major ||
          ( major === productionVersion.major && minor > productionVersion.minor )
        ) {
          const packageJSON = await getBranchPackageJSON( repo, totalityBranch );

          if ( !packageJSON.phet!.ignoreForAutomatedMaintenanceReleases ) {
            addStub( repo, branch );
          }
        }
      }
    }

    const limit = pLimit( 10 ); // limit to 5 concurrent requests

    return Promise.all( stubs.map( stub => limit( () => Checkout.getReleaseBranch( stub.repo, stub.branch ) ) ) );
  }

  public async getRunnableBranch( repo: Repo ): Promise<RunnableBranch> {
    const brands = await getBranchBrands( repo, this.branch );

    return new RunnableBranch( this, repo, brands );
  }

  public async gitAdd( file: string ): Promise<string> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot write to a detached head SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    winston.info( `git add ${file}` );

    return gitMutableExecute( [ 'add', file ], this.workingDirectory );
  }

  public async gitAddAll(): Promise<string> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot write to a detached head SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    winston.info( 'git add -A' );

    return gitMutableExecute( [ 'add', '-A' ], this.workingDirectory );
  }

  public async gitCommit( message: string ): Promise<string> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot write to a detached head SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    winston.info( `git commit with message:\n${message}` );

    return gitMutableExecute( [ 'commit', '--no-verify', '-m', message ], this.workingDirectory );
  }

  public async gitPush(): Promise<string> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot write to a detached head SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    winston.info( `git push to ${this.branch}` );

    return gitMutableExecute( [ 'push', '-u', 'origin', this.branch ], this.workingDirectory );
  }

  public async gitPull(): Promise<string> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot write to a detached head SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    winston.info( `git pull in ${this.workingDirectory}` );

    return gitMutableExecute( [ 'pull' ], this.workingDirectory );
  }

  public async gitPullRebase(): Promise<string> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot write to a detached head SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    winston.info( `git pull --rebase in ${this.workingDirectory}` );

    return gitMutableExecute( [ 'pull', '--rebase' ], this.workingDirectory );
  }

  public async gitCherryPick( target: SHA ): Promise<boolean> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot write to a detached head SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    winston.info( `git cherry-pick ${target}` );

    try {
      await gitMutableExecute( [ 'cherry-pick', target ], this.workingDirectory );

      return true;
    }
    catch( e ) {
      winston.info( `git cherry-pick failed (aborting): ${target}` );

      try {
        await gitMutableExecute( [ 'cherry-pick', '--abort' ], this.workingDirectory );

        return false;
      }
      catch( e ) {
        winston.error( `git cherry-pick --abort failed: ${target}` );

        throw e;
      }
    }
  }

  public async getSHA(): Promise<SHA> {
    if ( this.isSHA ) {
      return this.branch;
    }
    else {
      return gitRevParse( this.branch );
    }
  }

  public async getSymbolicRef(): Promise<BranchOrSHA> {
    if ( this.isSHA ) {
      return this.branch;
    }

    return ( await gitImmutableExecute( [ 'symbolic-ref', '-q', 'HEAD' ], this.workingDirectory ) ).trim();
  }

  public async getTrackingBranch(): Promise<Branch> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot get tracking branch for a SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get tracking branch if not checked out' );
    }

    return ( await gitImmutableExecute( [ 'for-each-ref', '--format=\'%(upstream:short)\'', await this.getSymbolicRef() ], this.workingDirectory ) ).trim();
  }

  public async getAheadBehind(): Promise<{ ahead: number; behind: number }> {
    // e.g. behind-count + '\t' + ahead-count
    const counts = await execute( 'git', [ 'rev-list', '--left-right', '--count', `${await this.getTrackingBranch()}@{u}...HEAD` ], this.workingDirectory );

    return {
      ahead: Number( counts.split( '\t' )[ 1 ] ),
      behind: Number( counts.split( '\t' )[ 0 ] )
    };
  }

  public async isClean( file?: string ): Promise<boolean> {
    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get tracking branch if not checked out' );
    }

    winston.debug( 'git status check' );

    const gitArgs = [ 'status', '--porcelain' ];

    if ( file ) {
      gitArgs.push( file );
    }

    return gitImmutableExecute( gitArgs, this.workingDirectory ).then( stdout => Promise.resolve( stdout.length === 0 ) );
  }

  public async npmUpdateRepo( repo: Repo, options?: NPMUpdateOptions ): Promise<void> {
    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get tracking branch if not checked out' );
    }

    return npmUpdateDirectory( `${this.workingDirectory}/${repo}`, options );
  }

  public async npmUpdate( options?: NPMUpdateOptions ): Promise<void> {
    for ( const npmRepo of [
      'chipper',
      'perennial-alias',
      ...( this.releaseBranch ? [ this.releaseBranch.repo ] : [] )
    ] ) {
      if ( fs.existsSync( `${this.workingDirectory}/${npmRepo}` ) ) {
        winston.info( `npm update ${npmRepo} in worktree` );

        await this.npmUpdateRepo( npmRepo );
      }
    }
  }

  public async updateBabel(): Promise<void> {
    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get tracking branch if not checked out' );
    }

    // TODO: consider using symbolic links? https://github.com/phetsims/totality/issues/140

    if ( fs.existsSync( `${this.workingDirectory}/babel` ) ) {
      winston.info( `pulling babel in ${this.workingDirectory}` );

      // NOTE: marked as "immutable" because we are the only ones who are doing this (and it isn't our main tree)
      await gitImmutableExecute( [ 'pull' ], `${this.workingDirectory}/babel` );
    }
    else {
      winston.info( `cloning babel into ${this.workingDirectory}` );

      // NOTE: marked as "immutable" because we are the only ones who are doing this (and it isn't our main tree)
      await gitImmutableExecute( [ 'clone', 'https://github.com/phetsims/babel.git' ], this.workingDirectory );
    }
  }

  public async ensurePrimaryCheckoutMatches(): Promise<void> {
    if ( this.isPrimary ) {
      const currentBranch = await getBranch();

      if ( currentBranch !== this.branch ) {
        throw new Error( `Expected current branch (${currentBranch}) to match checkout branch (${this.branch}) for primary checkout` );
      }
    }
  }

  public async update(): Promise<void> {
    if ( this.isPrimary ) {
      await this.updatePrimaryCheckout();
    }
    else if ( this.isMaintenance ) {
      await this.updateMaintenanceWorktree();
    }
    else {
      await this.updateWorktree();
    }
  }

  public async updatePrimaryCheckout(): Promise<void> {
    if ( !this.isPrimary ) {
      throw new Error( 'Expected updatePrimaryCheckout to be called on a primary checkout' );
    }

    await this.ensurePrimaryCheckoutMatches();

    winston.info( `pulling primary checkout at ${this.workingDirectory}` );
    await gitPullDirectory( this.workingDirectory );

    await this.updateBabel();
    await this.npmUpdate();
  }

  public async updateMaintenanceWorktree(): Promise<void> {
    if ( !this.isMaintenance ) {
      throw new Error( 'Expected updateMaintenanceWorktree to be called on a maintenance checkout' );
    }

    winston.info( `updating maintenance worktree for ${this.branch}` );

    // Create the container directory
    await this.ensureWorktreeParentDirectory();

    let updated = true;

    // Create the worktree itself if needed
    if ( !fs.existsSync( this.workingDirectory ) ) {
      winston.info( `creating worktree at ${this.workingDirectory}` );

      await gitCreateWorktree( this.workingDirectory, this.branch, {
        detach: true
      } );
    }
    else {
      const sha = ( await gitImmutableExecute( [ 'rev-parse', 'HEAD' ], this.workingDirectory ) ).trim();

      if ( sha !== this.branch ) {
        winston.info( `switching worktree at ${this.workingDirectory}` );
        await gitImmutableExecute( [ 'switch', '--detach', this.branch ], this.workingDirectory );
      }
      else {
        updated = false;
      }
    }

    await this.updateBabel();

    // If the SHA didn't change, we don't have to npm update things
    if ( updated ) {
      await this.npmUpdate();
    }
  }

  public async updateWorktree(): Promise<void> {
    if ( this.branch === 'main' ) {
      throw new Error( 'We do not have a separate worktree for main' );
    }
    if ( this.isPrimary ) {
      throw new Error( 'Expected updateWorktree to be called on a non-primary checkout' );
    }
    if ( this.isMaintenance ) {
      throw new Error( 'Expected updateWorktree to be called on a non-maintenance checkout' );
    }

    winston.info( `updating worktree for ${this.branch}` );

    // Create the container directory
    await this.ensureWorktreeParentDirectory();

    // Ensure our remote tracking is set up properly
    await ensureLocalBranchFromRemote( this.branch );

    // Create the worktree itself if needed
    if ( !fs.existsSync( this.workingDirectory ) ) {
      winston.info( `creating worktree at ${this.workingDirectory}` );

      this.isCheckedOut = true;

      await gitCreateWorktree( this.workingDirectory, this.branch );
    }
    else {
      winston.info( `pulling worktree at ${this.workingDirectory}` );
      await gitPullDirectory( this.workingDirectory );
    }

    await this.updateBabel();
    await this.npmUpdate();
  }

  public async removeWorktree(): Promise<void> {
    if ( this.branch === 'main' ) {
      throw new Error( 'Cannot remove worktree for main branch' );
    }

    if ( fs.existsSync( this.workingDirectory ) ) {
      winston.info( `removing worktree at ${this.workingDirectory}` );

      // double-force for babel
      await gitMutableExecute( [ 'worktree', 'remove', this.workingDirectory, '--force', '--force' ], '.' );
    }
  }

  /**
   * Ensure that the parent directory of the worktree exists. Since the worktree directory can include slashes which
   * create nested directories, we will need to create UP TO the last directory, but not including the last directory
   * (since that will be created by git worktree add).
   */
  public async ensureWorktreeParentDirectory(): Promise<void> {
    // Don't create the full worktree directory, since that will be created by git worktree add
    await createDirectory( path.dirname( this.workingDirectory ) );
  }


  /**
   * Returns whether the sim is compatible with ES6 features
   */
  public async usesES6(): Promise<boolean> {
    // chipper polyrepo 80b4ad62cd8f2057b844f18d3c00cf5c0c89ed8d
    return gitIsAncestor( 'be95288d3a5867fb38fd43936d5c8a473c2f0e17', this.branch );
  }

  /**
   * Returns whether this sim uses initialize-globals based query parameters
   *
   * If true:
   *   phet.chipper.queryParameters.WHATEVER
   *   AND it needs to be in the schema
   *
   * If false:
   *   phet.chipper.getQueryParameter( 'WHATEVER' )
   *   FLAGS should use !!phet.chipper.getQueryParameter( 'WHATEVER' )
   */
  public async usesInitializeGlobalsQueryParameters(): Promise<boolean> {
    // chipper polyrepo e454f88ff51d1e3fabdb3a076d7407a2a9e9133c
    return gitIsAncestor( '24dae95fdc221af4513684112b1addb8a1f7c10d', this.branch );
  }

  /**
   * Returns whether phet-io.standalone is the correct phet-io query parameter (otherwise it's the newer
   * phetioStandalone).
   *
   */
  public async usesOldPhetioStandalone(): Promise<boolean> {
    // chipper polyrepo 4814d6966c54f250b1c0f3909b71f2b9cfcc7665
    return gitIsAncestor( '6aa2943d55f673921609b7e76b6a808e033e439c', this.branch );
  }

  /**
   * Returns whether the relativeSimPath query parameter is used for wrappers (instead of launchLocalVersion).
   *
   */
  public async usesRelativeSimPath(): Promise<boolean> {
    // phet-io polyrepo e3fc26079358d86074358a6db3ebaf1af9725632
    return gitIsAncestor( '7f1f7a9470d9ced8edcb26837ff431cd61afa517', this.branch );
  }

  /**
   * Returns whether phet-io Studio is being used instead of deprecated instance proxies wrapper.
   *
   */
  public async usesPhetioStudio(): Promise<boolean> {
    // chipper polyrepo 7375f6a57b5874b6bbf97a54c9a908f19f88d38f
    return gitIsAncestor( 'fc479b2d8eb2ff354543e6cebe5c1bfbb44bb1cc', this.branch );
  }

  /**
   * Returns whether phet-io Studio top-level (index.html) is used instead of studio.html.
   *
   */
  public async usesPhetioStudioIndex(): Promise<boolean> {
    // phet-io-wrappers polyrepo 7ec1a04a70fb9707b381b8bcab3ad070815ef7fe
    return gitIsAncestor( '46fdcc098ba3b84e6f39d8506828c4ad629ef206', this.branch );
  }

  /**
   * Returns whether the sim for a release branch is a "Hydrogen" phet-io sim.
   */
  public async isPhetioHydrogen(): Promise<boolean> {
    // phet-io-wrappers polyrepo 7e8d97020c6451f68e898ae83aa43593b555137f
    return gitIsAncestor( '8c175d14c0d467d0e457f47a5f496455d2370b31', this.branch );
  }

  /**
   * Returns whether the sim is built with XHTML
   */
  public async hasXHTML(): Promise<boolean> {
    // chipper polyrepo 70c2d4b0cb0cb0cb457190e3ca889c406b663686
    return gitIsAncestor( '8a26d07ea32b04ec3fbe7efa60c180ec45c99273', this.branch );
  }


  /**
   * Returns whether an additional folder exists in the build directory of the sim based on the brand.
   */
  public async usesChipper2(): Promise<boolean> {
    const chipperVersion = await this.getChipperVersion();

    return chipperVersion.major !== 0 || chipperVersion.minor !== 0;
  }

  public async hasMigrationWrapper(): Promise<boolean> {
    // phet-io-wrappers polyrepo d8ad7267614d1b7cf3fc2d0d9cc11e3c592ac1ce
    return gitIsAncestor( '2328bdd8bacff4bf3858c8eef1bcc3c1dc648cad', this.branch );
  }

  /**
   * Returns the query parameter to use for activating phet-io standalone mode
   *
   */
  public async getPhetioStandaloneQueryParameter(): Promise<string> {
    return ( await this.usesOldPhetioStandalone() ) ? 'phet-io.standalone' : 'phetioStandalone';
  }

  /**
   * Returns the timestamp string with the date of when this release branch diverged from main.
   */
  public async getDivergingTimestampString(): Promise<string> {
    const divergingCommit = await gitFirstDivergingCommit( this.branch, 'main' );
    const timestamp = await gitTimestamp( divergingCommit );
    return new Date( timestamp ).toISOString().split( 'T' )[ 0 ];
  }

  /**
   * Use this when you just need read-only (or read-write, but it doesn't matter where) access to a working directory.
   *
   * NOTABLY this should NOT be used for things that e.g. check the current state of a specific checkout, OR things that
   * mutate the checkout.
   *
   * TODO: where am I not using this where I should be? https://github.com/phetsims/totality/issues/140
   */
  public getAnyWorkingDirectory(): string {
    return this.isCheckedOut ? this.workingDirectory : '..';
  }

  public async hasUpstreamBranch( branch: Branch ): Promise<boolean> {
    return ( await gitImmutableExecute( [
      'rev-parse',
      '--abbrev-ref',
      '--symbolic-full-name',
      `${branch}@{upstream}`
    ], this.getAnyWorkingDirectory(), { errors: 'resolve' } ) ).code === 0;
  }

  public async hasLocalBranch( branch: Branch ): Promise<boolean> {
    return (
      await gitImmutableExecute( [
        'show-ref',
        '--verify',
        '--quiet',
        `refs/heads/${branch}`
      ], this.getAnyWorkingDirectory(), { errors: 'resolve' } )
    ).code === 0;
  }

  public async fetchOrigin(): Promise<void> {
    winston.info( `fetching origin for ${this.branch}` );

    await gitMutableExecute( [ 'fetch', 'origin' ], this.getAnyWorkingDirectory() );
  }

  /**
   * Returns whether the origin was fetched as part of this (so we can skip it elsewhere)
   */
  public async ensureUpstreamBranch(): Promise<boolean> {
    if ( this.isSHA ) {
      return false;
    }

    if ( !await this.hasLocalBranch( this.branch ) ) {
      // If we are missing the branch, then kick off a full fetch so that the next things don't error
      await this.fetchOrigin();

      // Create the local branch, and have it track properly
      await gitMutableExecute( [
        'branch',
        '--track',
        this.branch,
        `origin/${this.branch}`
      ], this.getAnyWorkingDirectory() );

      return true;
    }
    else if ( !await this.hasUpstreamBranch( this.branch ) ) {
      // Track the already-existing branch
      await gitMutableExecute( [
        'branch',
        '--set-upstream-to',
        `origin/${this.branch}`,
        this.branch
      ], this.getAnyWorkingDirectory() );
    }

    return false;
  }

  /**
   * Updates the branch (like git pull, without forcing a checkout) with a fetch, and then a fast-forward merge if it
   * is checked out, or a fetch with refspec if it is not checked out.
   *
   * NOTE: This is needed because one method only works when the branch is checked out, and the other only works
   * when the branch is NOT checked out. Major pain, yes.
   */
  public async gitUpdateWithFetch(): Promise<void> {
    const fetched = await this.ensureUpstreamBranch();

    if ( this.isCheckedOut ) {
      if ( !fetched ) {
        await this.fetchOrigin();
      }

      // After fetching, this should do a fast-forward as needed
      await gitMutableExecute( [
        'merge',
        '--ff-only',
        `origin/${this.branch}`
      ], this.workingDirectory );
    }
    else {
      // If this branch is NOT checked out (anywhere!), we can do a fast-forward like this so we can still git cat-file out things, etc.
      await gitMutableExecute( [
        'fetch',
        'origin',
        `${this.branch}:${this.branch}`
      ], this.getAnyWorkingDirectory() );
    }
  }

  /**
   * Updates the branch (like git pull, without forcing a checkout) without  a fetch, and then a fast-forward merge if it
   * is checked out, or a fetch with refspec if it is not checked out.
   *
   * Assumes that a fetch was done recently (and we don't want to hit the backend again)
   *
   * NOTE: This is needed because one method only works when the branch is checked out, and the other only works
   * when the branch is NOT checked out. Major pain, yes.
   */
  public async gitUpdateWithoutFetch(): Promise<void> {
    await this.ensureUpstreamBranch();

    if ( this.isCheckedOut ) {
      await gitMutableExecute( [
        'merge',
        '--ff-only',
        `origin/${this.branch}`
      ], this.workingDirectory );
    }
    else {
      await gitMutableExecute( [
        'branch',
        '-f',
        this.branch,
        `origin/${this.branch}`
      ], this.getAnyWorkingDirectory() );
    }
  }

  /**
   * The SHA at which this release branch's main repository diverged from main.
   *
   * NOTE: fetches are needed before this, so things are up-to-date (!)
   */
  public async getDivergingSHA(): Promise<SHA> {
    if ( this.cachedDivergingSHA ) {
      return this.cachedDivergingSHA;
    }

    await this.gitUpdateWithoutFetch();

    winston.info( `getting first diverging commit for ${this.branch}` );

    const sha = await gitFirstDivergingCommit( this.branch, 'main' );

    this.cachedDivergingSHA = sha;

    return sha;
  }

  /**
   * The timestamp at which this release branch's main repository diverged from main.
   */
  public async getDivergingTimestamp(): Promise<number> {
    return gitTimestamp( await this.getDivergingSHA() );
  }

  public async getChipperVersion(): Promise<ChipperVersion> {
    const packageJSON = await getBranchPackageJSON( 'chipper', this.branch );

    return ChipperVersion.getFromPackageJSON( packageJSON );
  }

  /**
   * Whether the totality branch for this checkout includes the given SHA.
   * NOTE: octopus merges were done for legacy release branches, so ideally finding the totality SHA of an older polyrepo
   * commit will allow this to work.
   */
  public async includesSHA( sha: SHA ): Promise<boolean> {
    return gitIsAncestor( sha, this.branch );
  }

  /**
   * Whether the totality branch for this checkout is missing the given SHA.
   * NOTE: octopus merges were done for legacy release branches, so ideally finding the totality SHA of an older polyrepo
   * commit will allow this to work.
   */
  public async isMissingSHA( sha: SHA ): Promise<boolean> {
    const currentSHA = await gitRevParse( this.branch );

    return sha !== currentSHA && !( await this.includesSHA( sha ) );
  }

  /**
   * Returns the file contents for ${relativeFile} if it exists on this release branch,
   * or if it doesn't exist, returns an empty string (for convenience of branch string handling).
   *
   * This will be more performant than getSourceFileOptionalContents, but getSourceFileOptionalContents is recommended
   * for in-general use due to its flexibility.
   */
  public async getFileOptionalContents( relativeFile: string ): Promise<string> {
    try {
      return getFileAtBranch( this.branch, relativeFile );
    }
    catch( e ) {
      return '';
    }
  }

  /**
   * Returns the file contents for ${relativeFile} (with optional .ts and .js suffixes added),
   * or if none of them exist, returns an empty string (for convenience of branch string handling).
   *
   * Allows e.g. releaseBranch.getSourceFileOptionalContents( 'joist', 'js/AboutDialog' ),
   * without having to worry about (a) the suffix of AboutDialog (.js, .ts) and (b) whether the file exists at all on this branch.
   *
   * This is useful, because usually for maintenance we are doing a substring search (so an empty string if it doesn't
   * exist is perfect).
   *
   * If multiple paths potentially exist, those can be concatenated together without having to use conditionals.
   */
  public async getSourceFileOptionalContents( relativeFile: string ): Promise<string> {

    let fileContents = await this.getFileOptionalContents( relativeFile );

    if ( !fileContents.length ) {
      fileContents = await this.getFileOptionalContents( `${relativeFile}.ts` );
    }

    if ( !fileContents.length ) {
      fileContents = await this.getFileOptionalContents( `${relativeFile}.js` );
    }

    return fileContents;
  }

  /**
   * Returns a map of runnable => all dependency "repos" (including itself)
   *
   * NOTE: This will only work on "newer" checkouts (not old release branches), since it depends on print-multiple-dependencies
   *
   * NOTE: This does not include babel
   */
  public async getDependenciesMap( runnables: Repo[] = getActiveRunnables() ): Promise<Record<Repo, Repo[]>> {
    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    return JSON.parse( await execute(
      tsxCommand,
      [
        'js/scripts/print-multiple-dependencies.ts',
        runnables.join( ',' )
      ],
      `${this.workingDirectory}/chipper`
    ) );
  }

  /**
   * Checks whether it is likely that the given file has an import for something. Used for convenience during
   * complicated maintenance releases.
   */
  public async hasLikelyImport( relativeFile: string, name: string ): Promise<boolean> {
    const contents = await this.getSourceFileOptionalContents( relativeFile );

    return contents.split( '\n' ).some( line => {
      return ( line.includes( 'import' ) || line.includes( 'require' ) ) && line.includes( name );
    } );
  }

  public async writeRelativeFile( relativeFile: string, contents: string ): Promise<void> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot write to a detached head SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    winston.info( `writing file ${this.workingDirectory}/${relativeFile}` );

    return fsPromises.writeFile( `${this.workingDirectory}/${relativeFile}`, contents, 'utf-8' );
  }

  public async writeRelativeJSON( relativeFile: string, json: object ): Promise<void> {
    return this.writeRelativeFile( relativeFile, JSON.stringify( json, null, 2 ) + os.EOL );
  }

  public async writeAddRelativeFile( relativeFile: string, contents: string ): Promise<void> {
    await this.writeRelativeFile( relativeFile, contents );
    await this.gitAdd( relativeFile );
  }

  public async writeAddRelativeJSON( relativeFile: string, json: object ): Promise<void> {
    await this.writeRelativeJSON( relativeFile, json );
    await this.gitAdd( relativeFile );
  }

  public async getRelativeFileContents( relativeFile: string ): Promise<string> {
    return getFileAtBranch( this.branch, relativeFile );
  }

  public async getRelativeJSON<T extends object = IntentionalPerennialAny>( relativeFile: string ): Promise<T> {
    return JSON.parse( await getFileAtBranch( this.branch, relativeFile ) );
  }

  public existsRelative( relativeFile: string ): boolean {
    return fs.existsSync( `${this.workingDirectory}/${relativeFile}` );
  }
}
