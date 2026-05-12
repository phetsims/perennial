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
import { ReleaseBranch } from './ReleaseBranch.js';
import { getBranchVersion } from './getBranchVersion.js';
import { getBranchBrands } from './getBranchBrands.js';
import { ChipperVersion } from './ChipperVersion.js';
import { getFileAtBranch } from './getFileAtBranch.js';
import { gitIsAncestor } from './gitIsAncestor.js';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';
import { gitFirstDivergingCommit } from './gitFirstDivergingCommit.js';
import { gitTimestamp } from './gitTimestamp.js';
import { gitRevParse } from './gitRevParse.js';
import simMetadata, { SimMetadata } from './simMetadata';
import simPhetioMetadata, { SimPhetioMetadata } from './simPhetioMetadata.js';
import { getActiveSims } from './getActiveSims';
import { getBranches } from './getBranches.js';
import _ from 'lodash';
import os from 'os';
import { IntentionalPerennialAny } from '../browser-and-node/PerennialTypes.js';

export const WORKTREE_DIRECTORY = buildLocal.releaseBranchesDirectory;

// Let this data be cached so we don't need to re-request all the time (and share the requests when many things are made at once)
let simMetadataPromise!: Promise<SimMetadata>;
let simPhetioMetadataPromise!: Promise<SimPhetioMetadata[]>;
export const invalidateMetadataCache = (): void => {
  winston.info( 'loading phet brand ReleaseBranches' );
  simMetadataPromise = simMetadata( {
    type: 'html'
  } );
  winston.info( 'loading phet-io brand ReleaseBranches' );
  simPhetioMetadataPromise = simPhetioMetadata( {
    active: true,
    latest: true
  } );
};
invalidateMetadataCache();

export class Checkout {

  public releaseBranch: ReleaseBranch | null = null;

  // Protected so we can do async initialization in static methods
  protected constructor(
    public readonly branch: string,
    public readonly workingDirectory: string
  ) {

  }

  public static async getMainCheckout(): Promise<Checkout> {
    return new Checkout( 'main', '..' );
  }

  public static async getReleaseBranchCheckout( repo: string, legacyBranch: string ): Promise<Checkout> {
    const branch = Checkout.getReleaseBranchName( repo, legacyBranch );

    const checkout = new Checkout( branch, Checkout.getWorktreeDirectory( branch ) );

    const simVersion = await getBranchVersion( repo, branch );

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

      let releaseRepo = simData.name;
      let releaseBranch = `${simData.versionMajor}.${simData.versionMinor}`;
      if ( simData.versionSuffix.length ) {
        releaseBranch += `-${simData.versionSuffix}`; // additional dash required
      }

      return releaseRepo === repo && releaseBranch === legacyBranch;
    } );

    if ( simVersion.isSimPublished && !includePublishedPhetBrand && !includePublishedPhetioBrand ) {
      throw new Error( `Expected published sim ${repo} ${legacyBranch} to be included in metadata, but it was not` );
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

    checkout.releaseBranch = new ReleaseBranch( checkout, repo, branch, brands, simVersion.isSimPublished );

    return checkout;
  }

  public static async getReleaseBranch( repo: string, legacyBranch: string ): Promise<ReleaseBranch> {
    const checkout = await Checkout.getReleaseBranchCheckout( repo, legacyBranch );

    if ( !checkout.releaseBranch ) {
      throw new Error( `Expected release branch to be set for ${checkout.toString()}` );
    }

    return checkout.releaseBranch;
  }

  public static getReleaseBranchName( repo: string, legacyBranch: string ): string {
    return `releases/${repo}/${legacyBranch}`;
  }

  public static getWorktreeDirectory( branch: string ): string {
    // TODO: do we need escaping at all, if one branch is a substring of another? (e.g. feature/foo, feature/foo/bar)
    return `${WORKTREE_DIRECTORY}/${branch}`;
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
    type Stub = { repo: string; branch: string; };

    const stubs: Stub[] = [];
    const hasStub = ( repo: string, branch: string ): boolean => {
      return stubs.some( stub => stub.repo === repo && stub.branch === branch );
    }
    const addStub = ( repo: string, branch: string ): void => {
      // FAMB 2.3-phetio keeps ending up in the MR list when we don't want it to, see https://github.com/phetsims/phet-io/issues/1957.
      if ( repo === 'forces-and-motion-basics' && branch === '2.3-phetio' ) {
        return;
      }

      // Performance hopefully not a concern
      if ( !hasStub( repo, branch ) ) {
        stubs.push( { repo, branch } );
      }
    }

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

    return Promise.all( stubs.map( stub => Checkout.getReleaseBranch( stub.repo, stub.branch ) ) );
  }

  public async gitAdd( file: string ): Promise<string> {
    winston.info( `git add ${file}` );

    return execute( 'git', [ 'add', file ], this.workingDirectory );
  }

  public async gitCommit( message: string ): Promise<string> {
    winston.info( `git commit with message:\n${message}` );

    return execute( 'git', [ 'commit', '--no-verify', '-m', message ], this.workingDirectory );
  }

  public async isClean( file?: string ): Promise<boolean> {
    winston.debug( 'git status check' );

    const gitArgs = [ 'status', '--porcelain' ];

    if ( file ) {
      gitArgs.push( file );
    }

    return execute( 'git', gitArgs, this.workingDirectory ).then( stdout => Promise.resolve( stdout.length === 0 ) );
  }

  public async update(): Promise<void> {
    if ( this.releaseBranch ) {
      winston.info( `updating worktree for ${this.toString()}` );

      // Create the container directory
      await this.ensureWorktreeParentDirectory();

      // Ensure our remote tracking is set up properly
      await createLocalBranchFromRemote( this.branch );

      // Create the worktree itself if needed
      if ( !fs.existsSync( this.workingDirectory ) ) {
        winston.info( `creating worktree at ${this.workingDirectory}` );
        await gitCreateWorktree( this.workingDirectory, this.branch );
      }
      else {
        winston.info( `pulling worktree at ${this.workingDirectory}` );
        await gitPullDirectory( this.workingDirectory );
      }

      if ( fs.existsSync( `${this.workingDirectory}/babel` ) ) {
        winston.info( 'pulling babel in worktree' );
        await execute( 'git', [ 'pull' ], `${this.workingDirectory}/babel` );
      }
      else {
        winston.info( 'cloning babel into worktree' );
        await execute( 'git', [ 'clone', 'https://github.com/phetsims/babel.git' ], this.workingDirectory );
      }

      for ( const npmRepo of [ 'chipper', 'perennial-alias', this.releaseBranch.repo ] ) {
        if ( fs.existsSync( `${this.workingDirectory}/${npmRepo}` ) ) {
          winston.info( `npm update ${npmRepo} in worktree` );
          await npmUpdateDirectory( `${this.workingDirectory}/${npmRepo}` );
        }
      }
    }
    // else {
    //   // Ensure we are on main!
    //   const branch = await getBranch();
    //
    //   if ( !( await gitIsClean() ) ) {
    //     throw new Error( `Expected to be on a clean branch, but there are uncommitted changes` );
    //   }
    //
    //   // TODO: enable this: (disabled for my work in a feature branch)
    //   // if ( branch !== 'main' ) {
    //   //   await gitCheckout( 'main' );
    //   //
    //   //   // TODO: what to do here? We should update babel, yes?
    //   // }
    // }
  }

  public async removeWorktree(): Promise<void> {
    if ( this.branch === 'main' ) {
      throw new Error( `Cannot remove worktree for main branch` );
    }

    if ( fs.existsSync( this.workingDirectory ) ) {
      winston.info( `removing worktree at ${this.workingDirectory}` );

      // double-force for babel
      await execute( 'git', [ 'worktree', 'remove', this.workingDirectory, '--force', '--force' ], '.' );
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
    return await gitIsAncestor( '7f1f7a9470d9ced8edcb26837ff431cd61afa517', this.branch );;
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
    return await gitIsAncestor( '46fdcc098ba3b84e6f39d8506828c4ad629ef206', this.branch );;
  }

  /**
   * Returns whether the sim for a release branch is a "Hydrogen" phet-io sim.
   */
  public async isPhetioHydrogen(): Promise<boolean> {
    // phet-io-wrappers polyrepo 7e8d97020c6451f68e898ae83aa43593b555137f
    return await gitIsAncestor( '8c175d14c0d467d0e457f47a5f496455d2370b31', this.branch );;
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
    return await gitIsAncestor( '2328bdd8bacff4bf3858c8eef1bcc3c1dc648cad', this.branch );;
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
   * The SHA at which this release branch's main repository diverged from main.
   */
  public async getDivergingSHA(): Promise<string> {
    await createLocalBranchFromRemote( this.branch );

    return gitFirstDivergingCommit( this.branch, 'main' );
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
  public async includesSHA( sha: string ): Promise<boolean> {
    return gitIsAncestor( sha, this.branch );
  }

  /**
   * Whether the totality branch for this checkout is missing the given SHA.
   * NOTE: octopus merges were done for legacy release branches, so ideally finding the totality SHA of an older polyrepo
   * commit will allow this to work.
   */
  public async isMissingSHA( sha: string ): Promise<boolean> {
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
    winston.info( `writing file ${this.workingDirectory}/${relativeFile}` );

    return fsPromises.writeFile( `${this.workingDirectory}/${relativeFile}`, contents, 'utf-8' );
  }

  public async writeRelativeJSON( relativeFile: string, json: Object ): Promise<void> {
    return this.writeRelativeFile( relativeFile, JSON.stringify( json, null, 2 ) );
  }

  public async writeAddRelativeFile( relativeFile: string, contents: string ): Promise<void> {
    await this.writeRelativeFile( relativeFile, contents );
    await this.gitAdd( relativeFile );
  }

  public async writeAddRelativeJSON( relativeFile: string, json: Object ): Promise<void> {
    await this.writeRelativeJSON( relativeFile, json );
    await this.gitAdd( relativeFile );
  }

  public async getRelativeFileContents( relativeFile: string ): Promise<string> {
    return getFileAtBranch( this.branch, relativeFile );
  }

  public async getRelativeJSON<T extends Object = IntentionalPerennialAny>( relativeFile: string ): Promise<T> {
    return JSON.parse( await getFileAtBranch( this.branch, relativeFile ) ) + os.EOL;
  }
}