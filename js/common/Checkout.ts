// Copyright 2026, University of Colorado Boulder

/**
 * Represents a checked out copy of totality (either main copy or worktree).
 *
 * Checkouts can either be:
 *  - a "full" checkout (contains all totality code, i.e. main branch)
 *  - a "release branch" checkout (top-level directories are pruned so only packages needed for the specific sim are present)
 *
 * TODO: doc https://github.com/phetsims/totality/issues/140
 *
 * TODO: separate out static functions into separate files where appropriate https://github.com/phetsims/totality/issues/140
 *
 * TODO: require deployment with primary checkout as main-like, see https://github.com/phetsims/totality/issues/140
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
import { gitCreateWorktree } from './git/gitCreateWorktree.js';
import { gitPullDirectory } from './git/gitPullDirectory.js';
import execute from './execute.js';
import { npmUpdateDirectory, NPMUpdateOptions } from './npmUpdateDirectory.js';
import { ReleaseBranch } from './ReleaseBranch.js';
import { getBranchBrands } from './getBranchBrands.js';
import { ChipperVersion } from './ChipperVersion.js';
import { getFileAtBranch } from './getFileAtBranch.js';
import { gitIsAncestor } from './git/gitIsAncestor.js';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';
import { gitFirstDivergingCommit } from './git/gitFirstDivergingCommit.js';
import { gitTimestamp } from './git/gitTimestamp.js';
import { gitRevParse } from './git/gitRevParse.js';
import simMetadata, { SimMetadata } from './simMetadata.js';
import simPhetioMetadata, { SimPhetioMetadata } from './simPhetioMetadata.js';
import { getActiveSims } from './repos/getActiveSims.js';
import { getBranches } from './git/getBranches.js';
import os from 'os';
import { Branch, BranchOrSHA, BranchVersion, Dependency, IntentionalPerennialAny, LocaleData, PackageJSON, Runnable, SHA, Sim } from '../browser-and-node/PerennialTypes.js';
import assert from 'assert';
import { getBranch } from './git/getBranch.js';
import { hasRemoteBranch } from './git/hasRemoteBranch.js';
import SimVersion from '../browser-and-node/SimVersion.js';
import { gitIsClean } from './git/gitIsClean.js';
import { RunnableBranch } from './RunnableBranch.js';
import { getBranchSimVersion } from './getBranchSimVersion.js';
import { getActiveRunnables } from './repos/getActiveRunnables.js';
import { tsxCommand } from './tsxCommand.js';
import pLimit from 'p-limit';
import { escapeRegExp } from './escapeRegExp.js';
import _ from 'lodash';
import { gitImmutableExecute, gitMutableExecute } from './git/gitMutex.js';

export const WORKTREE_DIRECTORY = buildLocal.worktreesDirectory;
export const MAINTENANCE_WORKTREE_DIRECTORY = buildLocal.maintenanceWorktreeDirectory;

// Let this data be cached so we don't need to re-request all the time (and share the requests when many things are made at once)
let simMetadataPromise!: Promise<SimMetadata>;
let simPhetioMetadataPromise!: Promise<SimPhetioMetadata[]>;
// TODO: do this in launchpad, see https://github.com/phetsims/totality/issues/140
export const invalidateMetadataCache = (): void => {
  winston.debug( 'loading phet brand ReleaseBranches' );
  simMetadataPromise = simMetadata( {
    type: 'html'
  } );
  winston.debug( 'loading phet-io brand ReleaseBranches' );
  simPhetioMetadataPromise = simPhetioMetadata( {
    active: true,
    latest: true // NOTE: latest means "latest maintenance version with a major.minor"
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

    if ( !isPrimary && Checkout.isBranchNameMainlike( branch ) ) {
      throw new Error( 'Should not be creating a non-primary checkout for main branch' );
    }
  }

  public static async hasWorktree( branch: BranchOrSHA ): Promise<boolean> {
    if ( Checkout.isBranchNameMainlike( branch ) ) {
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

  public static async getOneOffCheckout( branch: Branch ): Promise<Checkout> {
    return Checkout.getGenericBranchCheckout( branch, false );
  }

  public static async getGenericBranchCheckout( branch: BranchOrSHA, isPrimary = false ): Promise<Checkout> {
    const directoryExists = isPrimary ? true : fs.existsSync( Checkout.getWorktreeDirectory( branch ) );
    const worktreeExists = isPrimary ? true : await Checkout.hasWorktree( branch );

    if ( directoryExists !== worktreeExists ) {
      throw new Error( `Expected worktree existence (${worktreeExists}) to match directory existence (${directoryExists}) for ${branch}` );
    }

    return new Checkout( branch, isPrimary, false, isPrimary ? '..' : Checkout.getWorktreeDirectory( branch ), worktreeExists );
  }

  public static async getMaintenanceCheckout(
    branchOrSHA: BranchOrSHA,
    referenceReleaseBranch?: ReleaseBranch
  ): Promise<Checkout> {
    const checkout = new Checkout( branchOrSHA, false, true, MAINTENANCE_WORKTREE_DIRECTORY, true );

    if ( referenceReleaseBranch ) {
      checkout.releaseBranch = new ReleaseBranch( checkout, referenceReleaseBranch.repo, referenceReleaseBranch.branch, referenceReleaseBranch.brands, referenceReleaseBranch.isReleased );
    }

    return checkout;
  }

  public static async getPhetPublishedBranch( sim: Sim ): Promise<BranchVersion | null> {
    for ( const simData of ( await simMetadataPromise ).projects ) {
      const releaseRepo = simData.name.slice( simData.name.indexOf( '/' ) + 1 );

      if ( releaseRepo !== sim ) {
        continue;
      }

      return `${simData.version.major}.${simData.version.minor}`;
    }

    return null;
  }

  public static async getPhetioPublishedBranches( sim: Sim ): Promise<BranchVersion[]> {
    const branchVersions: BranchVersion[] = [];

    for ( const simData of ( await simPhetioMetadataPromise ) ) {
      if ( !simData.active || !simData.latest ) {
        continue;
      }

      const releaseRepo = simData.name.slice( simData.name.indexOf( '/' ) + 1 );

      if ( releaseRepo !== sim ) {
        continue;
      }

      branchVersions.push( `${simData.versionMajor}.${simData.versionMinor}${simData.versionSuffix.length ? `-${simData.versionSuffix}` : ''}` );
    }

    return branchVersions;
  }

  /**
   * Returns a checkout that doesn't do checks and assumes that the worktree does NOT exist.
   *
   * Additionally, it does NOT create a ReleaseBranch object.
   *
   * This should be used for when the performance cost of the normal lookups is not acceptable.
   */
  public static async getLightweightReleaseBranchCheckout( sim: Sim, branchVersion: BranchVersion ): Promise<Checkout> {
    const branch = Checkout.getReleaseBranchName( sim, branchVersion );
    const workingDirectory = Checkout.getWorktreeDirectory( branch );

    return new Checkout( branch, false, false, workingDirectory, false );
  }

  public static async getReleaseBranchCheckout( sim: Sim, branchVersion: BranchVersion ): Promise<Checkout> {
    winston.debug( `getting release branch checkout for ${sim} ${branchVersion}` );

    const branch = Checkout.getReleaseBranchName( sim, branchVersion );
    const workingDirectory = Checkout.getWorktreeDirectory( branch );

    winston.debug( `  branch: ${branch}` );
    winston.debug( `  workingDirectory: ${workingDirectory}` );

    const directoryExists = fs.existsSync( workingDirectory );
    const worktreeExists = await Checkout.hasWorktree( branch );

    if ( directoryExists !== worktreeExists ) {
      throw new Error( `Expected worktree existence (${worktreeExists}) to match directory existence (${directoryExists}) for ${branch}` );
    }

    const checkout = new Checkout( branch, false, false, workingDirectory, worktreeExists );

    const simVersion = await getBranchSimVersion( sim, branch );
    winston.debug( `  simVersion: ${simVersion.toString()}` );

    const supportedBrands = await getBranchBrands( sim, branch );
    winston.debug( `  supportedBrands: ${supportedBrands.join( ',' )}` );

    const publishedPhetBranch = await Checkout.getPhetPublishedBranch( sim );
    winston.debug( `  publishedPhetBranch: ${publishedPhetBranch}` );
    const publishedPhetioBranches = await Checkout.getPhetioPublishedBranches( sim );
    winston.debug( `  publishedPhetioBranches: ${publishedPhetioBranches.join( ', ' )}` );

    type VersionComparison = 'olderThanPublished' | 'sameAsPublished' | 'newerThanPublished' | 'nothingPublished';
    const versionComparison = ( publishedBranchVersion: BranchVersion | null ): VersionComparison => {
      if ( !publishedBranchVersion ) {
        return 'nothingPublished';
      }

      const majorMinorFromBranch = ( b: BranchVersion ) => {
        const majorMinor = b.split( '-' )[ 0 ];

        return {
          major: Number( majorMinor.split( '.' )[ 0 ] ),
          minor: Number( majorMinor.split( '.' )[ 1 ] )
        };
      };

      const publishedMajorMinor = majorMinorFromBranch( publishedBranchVersion );
      const ourMajorMinor = majorMinorFromBranch( branchVersion );

      if ( ourMajorMinor.major === publishedMajorMinor.major && ourMajorMinor.minor === publishedMajorMinor.minor ) {
        return 'sameAsPublished';
      }
      else if ( ourMajorMinor.major < publishedMajorMinor.major || ( ourMajorMinor.major === publishedMajorMinor.major && ourMajorMinor.minor < publishedMajorMinor.minor ) ) {
        return 'olderThanPublished';
      }
      else {
        return 'newerThanPublished';
      }
    };

    const phetComparison = versionComparison( publishedPhetBranch );
    winston.debug( `  phetComparison: ${phetComparison}` );
    const phetioComparisons = publishedPhetioBranches.map( versionComparison );
    const hasPhetioBranchMatch = phetioComparisons.some( comparison => comparison === 'sameAsPublished' );
    winston.debug( `  hasPhetioBranchMatch: ${hasPhetioBranchMatch}` );

    if ( phetComparison === 'olderThanPublished' && !hasPhetioBranchMatch ) {
      winston.info( `Branch ${sim} ${branchVersion} is not maintained, not creating a ReleaseBranch object` );
      return checkout;
    }

    const isReleased = phetComparison === 'sameAsPublished' || hasPhetioBranchMatch;
    winston.debug( `  isReleased: ${isReleased}` );

    const desirePhetBrand = phetComparison !== 'olderThanPublished';
    const desirePhetioBrand = hasPhetioBranchMatch || !isReleased;

    const brands: string[] = [];

    if ( desirePhetBrand && supportedBrands.includes( 'phet' ) ) {
      brands.push( 'phet' );
    }
    if ( desirePhetioBrand && supportedBrands.includes( 'phet-io' ) ) {
      brands.push( 'phet-io' );
    }

    if ( brands.length === 0 ) {
      throw new Error( `Expected at least one supported brand for ${sim} ${branchVersion}, got none` );
    }

    checkout.releaseBranch = new ReleaseBranch( checkout, sim, branchVersion, brands, isReleased );

    return checkout;
  }

  public static async getReleaseBranch( sim: Sim, branchVersion: BranchVersion ): Promise<ReleaseBranch> {
    const checkout = await Checkout.getReleaseBranchCheckout( sim, branchVersion );

    if ( !checkout.releaseBranch ) {
      throw new Error( `Expected release branch to be set for ${checkout.branch}, perhaps this is an old release branch that is not maintained?` );
    }

    return checkout.releaseBranch;
  }

  public static async getMainRunnableBranch( sim: Sim ): Promise<RunnableBranch> {
    return ( await Checkout.getMainCheckout() ).getRunnableBranch( sim );
  }

  public static async getCurrentPrimaryRunnableBranch( sim: Sim ): Promise<RunnableBranch> {
    return ( await Checkout.getCurrentPrimaryCheckout() ).getRunnableBranch( sim );
  }

  /**
   * Returns the branch name for the given sim and branchVersion. Only release branches should start with releases/
   */
  public static getReleaseBranchName( sim: Sim, branchVersion: BranchVersion ): Branch {
    if ( branchVersion.startsWith( 'releases/' ) ) {
      throw new Error( `Expected branch version to not start with releases/, got: ${branchVersion}` );
    }

    return `releases/${sim}/${branchVersion}`;
  }

  /**
   * Returns the branch name for the given sim and one-off name. Only one-off branches should start with one-off/
   */
  public static getOneOffBranchName( sim: Sim, oneOffName: string ): Branch {
    if ( oneOffName.startsWith( 'one-off/' ) ) {
      throw new Error( `Expected one-off name to not start with releases/, got: ${oneOffName}` );
    }

    if ( oneOffName.includes( '/' ) ) {
      throw new Error( `Expected one-off name to not include slashes, got: ${oneOffName}` );
    }

    return `one-off/${sim}/${oneOffName}`;
  }

  /**
   * Used during development to be able to treat non-main branches as if they were main
   */
  public static isBranchNameMainlike( branch: Branch ): boolean {
    return branch === 'main' || branch === 'features/totality/issues/140';
  }

  public static getWorktreeDirectory( branch: BranchOrSHA ): string {
    if ( Checkout.isBranchNameMainlike( branch ) ) {
      throw new Error( 'Should not be getting a worktree directory for main branch' );
    }

    // NOTE: Assuming, based on the spec of branch names, that we do not need to do any escaping here, since there
    // will be no overlap
    return `${WORKTREE_DIRECTORY}/${branch}`;
  }

  public static async createReleaseBranchCheckout(
    sim: Sim,
    branchVersion: BranchVersion,
    brands: string[],
    message?: string // appended to the commit message for the initial release branch commit, if provided
  ): Promise<Checkout> {
    const branch = Checkout.getReleaseBranchName( sim, branchVersion );

    const major = Number( branchVersion.split( '.' )[ 0 ] );
    const minor = Number( branchVersion.split( '.' )[ 1 ] );
    assert( major > 0, 'Major version for a branch should be greater than zero' );
    assert( minor >= 0, 'Minor version for a branch should be greater than (or equal) to zero' );

    assert( Array.isArray( brands ), 'supported brands required' );
    assert( brands.length >= 1, 'must have a supported brand' );


    const currentBranch = await getBranch();
    // TODO: remove this testing branch for the future https://github.com/phetsims/totality/issues/140
    if ( !Checkout.isBranchNameMainlike( currentBranch ) ) {
      throw new Error( `Should be on main to create a release branch, not: ${currentBranch ? currentBranch : '(detached head)'}` );
    }

    const primaryCheckout = await Checkout.getCurrentPrimaryCheckout();

    const hasBranchAlready = await hasRemoteBranch( branch );
    if ( hasBranchAlready ) {
      throw new Error( 'Branch already exists, aborting' );
    }

    winston.info( 'Will set the release branch version to rc.0 so it will auto-increment to rc.1 for the first RC deployment' );
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
    winston.info( 'Getting dependency repos' );
    const dependencies = await ( await primaryCheckout.getRunnableBranch( sim ) ).getDependencies();

    const releaseBranch = new ReleaseBranch( checkout, sim, branchVersion, brands, false );
    checkout.releaseBranch = releaseBranch;

    winston.info( `Creating branch ${branch}` );

    // Create the branch in git, and push it directly (not using the other helpers, since we are doing this from the MAIN directory)
    await gitMutableExecute( [ 'checkout', '-b', branch ], '..' );
    await gitMutableExecute( [ 'push', '-u', 'origin', branch ], '..' ); // not using this.gitPush, since this is our first
    await gitMutableExecute( [ 'checkout', currentBranch ], '..' );

    // Ensure that we are remotely tracked now (sanity check)
    winston.info( `Setting up tracking remote branch ${branch}` );
    await ensureLocalBranchFromRemote( branch );

    // Ensure we have a checkout (so we can modify and push from that region).
    winston.info( 'Creating worktree' );
    await checkout.updateWorktree();

    // Remove everything except for dependencies, '.git' (so our worktree works), and babel (since we just directly checked it out)
    const topLevelFilesToRemove = ( await fsPromises.readdir( checkout.workingDirectory ) ).filter( file => {
      return !dependencies.includes( file ) && file !== '.git' && file !== 'babel';
    } );
    for ( const file of topLevelFilesToRemove ) {
      winston.info( `Removing ${file} from release branch worktree` );

      await fsPromises.rm( `${checkout.workingDirectory}/${file}`, { recursive: true, force: true } );
    }

    // Add in a minimal .gitignore
    winston.info( 'Adding .gitignore' );
    await fsPromises.writeFile( `${checkout.workingDirectory}/.gitignore`, `/babel/${os.EOL}.DS_Store${os.EOL}` );

    winston.info( 'Worktree changes add/commit/push' );
    await checkout.gitAddAll();
    await checkout.gitCommit( `Initial commit for release branch ${branch}${message ? `: ${message}` : ''}` );
    await checkout.gitRebasePush();

    winston.info( 'Worktree setting/pushing supported brands' );
    await releaseBranch.setSupportedBrands( brands );

    winston.info( 'Worktree setting/pushing sim version' );
    await releaseBranch.setSimVersion( newVersion, message );

    // Update the version info in main
    winston.info( 'Updating main sim version and HTML' );
    // TODO: remove this testing branch for the future https://github.com/phetsims/totality/issues/140 (only support main)
    const primaryRunnableBranch = await ( await Checkout.getCurrentPrimaryCheckout() ).getRunnableBranch( sim );
    await primaryRunnableBranch.checkout.gitPullRebase();
    await primaryRunnableBranch.setSimVersion( new SimVersion( major, minor + 1, 0, {
      testType: 'dev',
      testNumber: 0
    } ), message );
    await primaryRunnableBranch.updateHTMLVersion();

    return checkout;
  }

  public static async createOneOffCheckout(
    sim: Sim,
    oneOffName: string,
    message?: string // appended to the commit message for the initial release branch commit, if provided
  ): Promise<Checkout> {
    const branch = Checkout.getOneOffBranchName( sim, oneOffName );

    const hasBranchAlready = await hasRemoteBranch( branch );
    if ( hasBranchAlready ) {

      // Comment this line out if you know, because you just created the branch on accident.
      throw new Error( 'Branch already exists, aborting' );
    }

    const primaryCheckout = await Checkout.getCurrentPrimaryCheckout();
    const mainRunnableBranch = await primaryCheckout.getRunnableBranch( sim );

    const branchedVersion = await mainRunnableBranch.getSimVersion();

    const newVersion = new SimVersion( branchedVersion.major, branchedVersion.minor, 0, {
      testType: branch,
      testNumber: 0
    } );

    const isClean = await primaryCheckout.isClean();
    if ( !isClean ) {
      throw new Error( 'Unclean status, cannot create one-off branch' );
    }

    const checkout = new Checkout( branch, false, false, Checkout.getWorktreeDirectory( branch ), false );

    winston.info( `Creating branch ${branch}` );

    // Create the branch in git, and push it directly (not using the other helpers, since we are doing this from the MAIN directory)
    await gitMutableExecute( [ 'checkout', '-b', branch ], '..' );
    await gitMutableExecute( [ 'push', '-u', 'origin', branch ], '..' ); // not using this.gitPush, since this is our first
    await gitMutableExecute( [ 'checkout', primaryCheckout.branch ], '..' );

    // Ensure that we are remotely tracked now (sanity check)
    winston.info( `Setting up tracking remote branch ${branch}` );
    await ensureLocalBranchFromRemote( branch );

    // Ensure we have a checkout (so we can modify and push from that region).
    winston.info( 'Creating worktree' );
    await checkout.updateWorktree();

    const runnableBranch = await checkout.getRunnableBranch( sim );

    winston.info( 'Worktree setting/pushing sim version' );
    await runnableBranch.setSimVersion( newVersion, message );

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

    type Stub = { sim: Sim; branchVersion: BranchVersion };

    const stubs: Stub[] = [];
    const hasStub = ( sim: Sim, branchVersion: BranchVersion ): boolean => {
      return stubs.some( stub => stub.sim === sim && stub.branchVersion === branchVersion );
    };
    const addStub = ( sim: Sim, branchVersion: BranchVersion ): void => {
      // FAMB 2.3-phetio keeps ending up in the MR list when we don't want it to, see https://github.com/phetsims/phet-io/issues/1957.
      if ( sim === 'forces-and-motion-basics' && branchVersion === '2.3-phetio' ) {
        return;
      }

      // Performance hopefully not a concern
      if ( !hasStub( sim, branchVersion ) ) {
        stubs.push( { sim: sim, branchVersion: branchVersion } );
      }
    };

    // phet metadata
    for ( const simData of ( await simMetadataPromise ).projects ) {
      const sim = simData.name.slice( simData.name.indexOf( '/' ) + 1 );
      const branch = `${simData.version.major}.${simData.version.minor}`;

      addStub( sim, branch );
    }

    // phet-io metadata
    for ( const simData of ( await simPhetioMetadataPromise ) ) {
      if ( !simData.active || !simData.latest ) {
        continue;
      }

      const sim = simData.name;
      let branch = `${simData.versionMajor}.${simData.versionMinor}`;
      if ( simData.versionSuffix.length ) {
        branch += `-${simData.versionSuffix}`; // additional dash required
      }

      addStub( sim, branch );
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

        const sim = match[ 1 ];
        const major = Number( match[ 2 ] );
        const minor = Number( match[ 3 ] );
        const branch = `${major}.${minor}`;


        if ( sim === 'chains' ) {
          continue; // chains was used as a special case, so we need to ignore those for now
        }

        // Only look for active sim sims
        if ( !activeSims.includes( sim ) ) {
          continue;
        }

        if ( hasStub( sim, branch ) ) {
          continue;
        }

        // Assumption that there is no phet-io brand sim that isn't also released with phet brand
        const projectMetadata = ( await simMetadataPromise ).projects.find( project => project.name === `html/${sim}` ) || null;
        const productionVersion = projectMetadata ? projectMetadata.version : null;

        if (
          !productionVersion ||
          major > productionVersion.major ||
          ( major === productionVersion.major && minor > productionVersion.minor )
        ) {
          const packageJSON = await getBranchPackageJSON( sim, totalityBranch );

          if ( !packageJSON.phet!.ignoreForAutomatedMaintenanceReleases ) {
            addStub( sim, branch );
          }
        }
      }
    }

    const limit = pLimit( 10 ); // limit to 5 concurrent requests

    return Promise.all( _.sortBy( stubs, [ 'sim', 'branch' ] ).map( stub => limit( () => Checkout.getReleaseBranch( stub.sim, stub.branchVersion ) ) ) );
  }

  public async getRunnableBranch( runnable: Runnable ): Promise<RunnableBranch> {
    const brands = await getBranchBrands( runnable, this.branch );

    return new RunnableBranch( this, runnable, brands );
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

  public async gitRebasePush(): Promise<void> {
    if ( this.isSHA ) {
      throw new Error( 'Cannot write to a detached head SHA' );
    }

    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get dependencies map for a checkout that is not checked out' );
    }

    winston.info( `git push to ${this.branch}` );

    await gitMutableExecute( [ 'pull', '--rebase', 'origin', this.branch ], this.workingDirectory );
    await gitMutableExecute( [ 'push', '-u', 'origin', this.branch ], this.workingDirectory );
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

    return ( await gitImmutableExecute( [ 'for-each-ref', '--format=%(upstream:short)', await this.getSymbolicRef() ], this.workingDirectory ) ).trim();
  }

  // TODO: this is likely wrong: to quote: https://github.com/phetsims/totality/issues/140
  // TODO: it calls getTrackingBranch() and then appends @{u} to the upstream https://github.com/phetsims/totality/issues/140
  // TODO: branch, producing something like origin/main@{u}...HEAD. Remote-tracking branches usually do not have upstreams. It probably wants either https://github.com/phetsims/totality/issues/140
  // TODO: @{u}...HEAD from the checked-out branch, or origin/main...HEAD without @{u}. https://github.com/phetsims/totality/issues/140
  public async getAheadBehind(): Promise<{ ahead: number; behind: number }> {
    // e.g. behind-count + '\t' + ahead-count
    const counts = await gitImmutableExecute( [ 'rev-list', '--left-right', '--count', `${await this.getTrackingBranch()}@{u}...HEAD` ], this.workingDirectory );

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

  public async npmUpdateRepo( sim: Sim, options?: NPMUpdateOptions ): Promise<void> {
    if ( !this.isCheckedOut ) {
      throw new Error( 'Cannot get tracking branch if not checked out' );
    }

    return npmUpdateDirectory( `${this.workingDirectory}/${sim}`, options );
  }

  public async npmUpdate( options?: NPMUpdateOptions ): Promise<void> {
    for ( const npmRepo of [
      'chipper',
      'perennial-alias',

      // We skip the repo itself, unless it is an older release branch where this is needed.
      ...( this.releaseBranch && !( await this.hasGruntRepoFlag() ) ? [ this.releaseBranch.repo ] : [] )
    ] ) {
      if ( fs.existsSync( `${this.workingDirectory}/${npmRepo}` ) ) {
        winston.info( `npm update ${npmRepo} in worktree` );

        await this.npmUpdateRepo( npmRepo, options );
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
      // So we don't have to use gitMutableExecute (since we won't have conflicts on this specific git repository)
      await gitImmutableExecute( [ 'pull' ], `${this.workingDirectory}/babel` );
    }
    else {
      winston.info( `cloning babel into ${this.workingDirectory}` );

      // NOTE: marked as "immutable" because we are the only ones who are doing this (and it isn't our main tree)
      // So we don't have to use gitMutableExecute (since we won't have conflicts on this specific git repository)
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
        await gitMutableExecute( [ 'switch', '--detach', this.branch ], this.workingDirectory );
        await gitMutableExecute( [ 'clean', '-fd' ], this.workingDirectory );
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
    if ( Checkout.isBranchNameMainlike( this.branch ) ) {
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
    if ( Checkout.isBranchNameMainlike( this.branch ) ) {
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
   * Returns whether we can `grunt --repo` from chipper for this sim
   */
  public async hasGruntRepoFlag(): Promise<boolean> {
    return gitIsAncestor( '8d8fd4b95310e5b8d41da91cf79d169f86a56244', this.branch );
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

  public async hasTopLevelStudioIndex(): Promise<boolean> {
    // chipper polyrepo 8db0653ee0cbb6ed716fa3b4d4759bcb75d8118a --- from getPhetioLinks
    return gitIsAncestor( 'bdff4df5dbf0d0bbdd7ad1d949bd7acf1dec05b7', this.branch );
  }

  /**
   * Returns the query parameter to use for activating phet-io standalone mode
   *
   */
  public async getPhetioStandaloneQueryParameter(): Promise<string> {
    return ( await this.usesOldPhetioStandalone() ) ? 'phet-io.standalone' : 'phetioStandalone';
  }

  /**
   * Use this when you just need read-only (or read-write, but it doesn't matter where) access to a working directory.
   *
   * NOTABLY this should NOT be used for things that e.g. check the current state of a specific checkout, OR things that
   * mutate the checkout.
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

  /**
   * Returns the timestamp string with the date of when this release branch diverged from main.
   */
  public async getDivergingTimestampString(): Promise<string> {
    return new Date( await this.getDivergingTimestamp() ).toISOString().split( 'T' )[ 0 ];
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
      return await getFileAtBranch( this.branch, relativeFile );
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
  public async getDependenciesMap( runnables: Runnable[] = getActiveRunnables() ): Promise<Record<Runnable, Dependency[]>> {
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

  public async getPackageJSON( dependency: Dependency ): Promise<PackageJSON> {
    return this.getRelativeJSON( `${dependency}/package.json` );
  }

  public existsRelative( relativeFile: string ): boolean {
    return fs.existsSync( `${this.workingDirectory}/${relativeFile}` );
  }

  public async getLocaleData(): Promise<LocaleData> {
    return JSON.parse( await fsPromises.readFile( `${this.workingDirectory}/babel/localeData.json`, 'utf-8' ) );
  }
}
