// Copyright 2018, University of Colorado Boulder

/**
 * The main persistent state-bearing object for maintenance releases. Can be loaded from or saved to a dedicated file.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

import assert from 'assert';
// @ts-expect-error - no @types for this project
import asyncQ from 'async-q';
import fs from 'fs';
import _ from 'lodash';
import repl from 'repl';
import winston from 'winston';
import production from '../grunt/production.js';
import rc from '../grunt/rc.js';
import build from './build.js';
import checkoutMain from './checkoutMain.js';
import checkoutTarget from './checkoutTarget.js';
import chipperSupportsOutputJSGruntTasks from './chipperSupportsOutputJSGruntTasks.js';
import ChipperVersion from './ChipperVersion.js';
import execute from './execute.js';
import getActiveRepos from './getActiveRepos.js';
import getBranches from './getBranches.js';
import getBranchMap from './getBranchMap.js';
import type { BuildOptions } from './getBuildArguments.js';
import getDependencies from './getDependencies.js';
import gitAdd from './gitAdd.js';
import gitCheckout from './gitCheckout.js';
import gitCherryPick from './gitCherryPick.js';
import gitCommit from './gitCommit.js';
import gitCreateBranch from './gitCreateBranch.js';
import gitIsClean from './gitIsClean.js';
import gitPull from './gitPull.js';
import gitPush from './gitPush.js';
import gitRevParse from './gitRevParse.js';
import gruntCommand from './gruntCommand.js';
import ModifiedBranch from './ModifiedBranch.js';
import Patch from './Patch.js';
import ReleaseBranch from './ReleaseBranch.js';

// constants
const MAINTENANCE_FILE = '.maintenance.json';

// const PUBLIC_FUNCTIONS = [
//   'addAllNeededPatches',
//   'addNeededPatch',
//   'addNeededPatches',
//   'addNeededPatchesAfter',
//   'addNeededPatchesBefore',
//   'addNeededPatchesBuildFilter',
//   'addNeededPatchReleaseBranch',
//   'addPatchSHA',
//   'applyPatches',
//   'buildAll',
//   'checkBranchStatus',
//   'checkoutBranch',
//   'createPatch',
//   'deployProduction',
//   'deployReleaseCandidates',
//   'list',
//   'listLinks',
//   'removeNeededPatch',
//   'removeNeededPatches',
//   'removeNeededPatchesAfter',
//   'removeNeededPatchesBefore',
//   'removePatch',
//   'removePatchSHA',
//   'reset',
//   'updateDependencies'
//   'getAllMaintenanceBranches'
// ];

type MaintenanceSerialized = {
  patches: ReturnType<Patch['serialize']>[];
  modifiedBranches: ReturnType<ModifiedBranch['serialize']>[];
  allReleaseBranches: ReturnType<ReleaseBranch['serialize']>[];
};

type UpdateCheckoutsOptions = {
  concurrent: number;
  build: boolean;
  transpile: boolean;
  buildOptions: Partial<BuildOptions>;
};

type FilterSyncRB = ( releaseBranch: ReleaseBranch ) => boolean;
type FilterSyncMB = ( releaseBranch: ModifiedBranch ) => boolean;
type FilterRB = ( releaseBranch: ReleaseBranch ) => Promise<boolean>;
type FilterMB = ( releaseBranch: ModifiedBranch ) => Promise<boolean>;

class Maintenance {
  public constructor(
    public readonly patches: Patch[] = [],
    public readonly modifiedBranches: ModifiedBranch[] = [],
    public allReleaseBranches: ReleaseBranch[] = [] ) {}

  /**
   * Resets ALL the maintenance state to a default "blank" state.
   *
   * @param keepCachedReleaseBranches {boolean} - allReleaseBranches take a while to populate, and have little to do
   *                                              with the current MR, so optionally keep them in storage.
   *
   * CAUTION: This will remove any information about any ongoing/complete maintenance release from your
   * .maintenance.json. Generally this should be done before any new maintenance release.
   */
  public static reset( keepCachedReleaseBranches = false ): void {
    console.log( 'Make sure to check on the active PhET-iO Deploy Status on phet.colorado.edu to ensure that the ' +
                 'right PhET-iO sims are included in this maintenance release.' );

    const allReleaseBranches = [];
    if ( keepCachedReleaseBranches ) {
      const maintenance = Maintenance.load();
      allReleaseBranches.push( ...maintenance.allReleaseBranches );
    }
    new Maintenance( [], [], allReleaseBranches ).save();
  }

  /**
   * Runs a number of checks through every release branch.
   *
   *
   * @param filter - Optional filter, release branches will be skipped if this resolves to false
   */
  public static async checkBranchStatus( filter?: FilterSyncRB ): Promise<void> {
    for ( const repo of getActiveRepos() ) {
      if ( repo !== 'perennial' && !( await gitIsClean( repo ) ) ) {
        console.log( `Unclean repository: ${repo}, please resolve this and then run checkBranchStatus again` );
        return;
      }
    }

    const releaseBranches = await Maintenance.getMaintenanceBranches( filter );

    // Set up a cache of branchMaps so that we don't make multiple requests
    const branchMaps: Record<string, Record<string, string>> = {};
    const getBranchMapAsyncCallback = async ( repo: string ) => {
      if ( !branchMaps[ repo ] ) {
        // eslint-disable-next-line require-atomic-updates
        branchMaps[ repo ] = await getBranchMap( repo );
      }
      return branchMaps[ repo ];
    };

    for ( const releaseBranch of releaseBranches ) {
      if ( !filter || filter( releaseBranch ) ) {
        console.log( `${releaseBranch.repo} ${releaseBranch.branch}` );
        for ( const line of await releaseBranch.getStatus( getBranchMapAsyncCallback ) ) {
          console.log( `  ${line}` );
        }
      }
      else {
        console.log( `${releaseBranch.repo} ${releaseBranch.branch} (skipping due to filter)` );
      }
    }
  }

  /**
   * Builds all release branches (so that the state of things can be checked). Puts in in perennial/build.
   */
  public static async buildAll(): Promise<void> {
    const releaseBranches = await Maintenance.getMaintenanceBranches();

    const failed = [];

    for ( const releaseBranch of releaseBranches ) {
      console.log( `building ${releaseBranch.repo} ${releaseBranch.branch}` );
      try {
        await checkoutTarget( releaseBranch.repo, releaseBranch.branch, true ); // include npm update
        await build( releaseBranch.repo, {
          brands: releaseBranch.brands
        } );
        throw new Error( 'UNIMPLEMENTED, copy over' );
      }
      catch( e ) {
        failed.push( `${releaseBranch.repo} ${releaseBranch.brands}` );
      }
    }

    if ( failed.length ) {
      console.log( `Failed builds:\n${failed.join( '\n' )}` );
    }
    else {
      console.log( 'Builds complete' );
    }
  }

  /**
   * Displays a listing of the current maintenance status.
   */
  public static async list(): Promise<void> {
    const maintenance = Maintenance.load();

    // At the top so that the important items are right above your cursor after calling the function
    if ( maintenance.allReleaseBranches.length > 0 ) {
      console.log( `Total recognized ReleaseBranches: ${maintenance.allReleaseBranches.length}` );
    }

    console.log( '\nRelease Branches in MR:', maintenance.patches.length === 0 ? 'None' : '' );
    for ( const modifiedBranch of maintenance.modifiedBranches ) {
      const count = maintenance.modifiedBranches.indexOf( modifiedBranch ) + 1;
      console.log( `${count}. ${modifiedBranch.repo} ${modifiedBranch.branch} ${modifiedBranch.brands.join( ',' )}${modifiedBranch.releaseBranch.isReleased ? '' : ' (unreleased)'}` );
      if ( modifiedBranch.deployedVersion ) {
        console.log( `    deployed: ${modifiedBranch.deployedVersion.toString()}` );
      }
      if ( modifiedBranch.neededPatches.length ) {
        console.log( `    needs: ${modifiedBranch.neededPatches.map( patch => patch.name ).join( ',' )}` );
      }
      if ( modifiedBranch.pushedMessages.length ) {
        console.log( `    pushedMessages: \n      ${modifiedBranch.pushedMessages.join( '\n      ' )}` );
      }
      if ( modifiedBranch.pendingMessages.length ) {
        console.log( `    pendingMessages: \n      ${modifiedBranch.pendingMessages.join( '\n      ' )}` );
      }
      if ( Object.keys( modifiedBranch.changedDependencies ).length > 0 ) {
        console.log( '    deps:' );
        for ( const key of Object.keys( modifiedBranch.changedDependencies ) ) {
          console.log( `      ${key}: ${modifiedBranch.changedDependencies[ key ]}` );
        }
      }
    }

    console.log( '\nMaintenance Patches in MR:', maintenance.patches.length === 0 ? 'None' : '' );
    for ( const patch of maintenance.patches ) {
      const count = maintenance.patches.indexOf( patch ) + 1;
      const indexAndSpacing = `${count}. ` + ( count > 9 ? '' : ' ' );

      console.log( `${indexAndSpacing}[${patch.name}]${patch.name !== patch.repo ? ` (${patch.repo})` : ''} ${patch.message}` );
      for ( const sha of patch.shas ) {
        console.log( `      ${sha}` );
      }
      for ( const modifiedBranch of maintenance.modifiedBranches ) {
        if ( modifiedBranch.neededPatches.includes( patch ) ) {
          console.log( `        ${modifiedBranch.repo} ${modifiedBranch.branch} ${modifiedBranch.brands.join( ',' )}` );
        }
      }
    }
  }

  /**
   * Shows any required testing links for the simulations.
   * @param filter - Control which branches are shown
   */
  public static async listLinks( filter: FilterSyncMB = () => true ): Promise<void> {
    const maintenance = Maintenance.load();

    const deployedBranches = maintenance.modifiedBranches.filter( modifiedBranch => !!modifiedBranch.deployedVersion && filter( modifiedBranch ) );
    const productionBranches = deployedBranches.filter( modifiedBranch => modifiedBranch.deployedVersion?.testType === null );
    const releaseCandidateBranches = deployedBranches.filter( modifiedBranch => modifiedBranch.deployedVersion?.testType === 'rc' );

    if ( productionBranches.length ) {
      console.log( '\nProduction links\n' );

      for ( const modifiedBranch of productionBranches ) {
        const links = await modifiedBranch.getDeployedLinkLines();
        for ( const link of links ) {
          console.log( link );
        }
      }
    }

    if ( releaseCandidateBranches.length ) {
      console.log( '\nRelease Candidate links\n' );

      for ( const modifiedBranch of releaseCandidateBranches ) {
        const links = await modifiedBranch.getDeployedLinkLines();
        for ( const link of links ) {
          console.log( link );
        }
      }
    }
  }

  /**
   * Creates an issue to note patches on all unreleased branches that include a pushed message.
   */
  public static async createUnreleasedIssues( additionalNotes = '' ): Promise<void> {
    const maintenance = Maintenance.load();

    for ( const modifiedBranch of maintenance.modifiedBranches ) {
      if ( !modifiedBranch.releaseBranch.isReleased && modifiedBranch.pushedMessages.length > 0 ) {
        console.log( `Creating issue for ${modifiedBranch.releaseBranch.toString()}` );
        await modifiedBranch.createUnreleasedIssue( additionalNotes );
      }
    }

    console.log( 'Finished creating unreleased issues' );
  }

  /**
   * Creates a patch
   * @param [patchName] - If no name is provided, the repo string will be used.
   */
  public static async createPatch( repo: string, message: string, patchName?: string ): Promise<void> {
    const maintenance = Maintenance.load();

    patchName = patchName || repo;

    for ( const patch of maintenance.patches ) {
      if ( patch.name === patchName ) {
        throw new Error( 'Multiple patches with the same name are not concurrently supported' );
      }
    }

    maintenance.patches.push( new Patch( repo, patchName, message ) );

    maintenance.save();

    console.log( `Created patch for ${repo} with message: ${message}` );
  }

  /**
   * Removes a patch
   */
  public static async removePatch( patchName: string ): Promise<void> {
    const maintenance = Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    for ( const branch of maintenance.modifiedBranches ) {
      if ( branch.neededPatches.includes( patch ) ) {
        throw new Error( 'Patch is marked as needed by at least one branch' );
      }
    }

    maintenance.patches.splice( maintenance.patches.indexOf( patch ), 1 );

    maintenance.save();

    console.log( `Removed patch for ${patchName}` );
  }

  /**
   * Adds a particular SHA (to cherry-pick) to a patch.
   */
  public static async addPatchSHA( patchName: string, sha?: string ): Promise<void> {
    const maintenance = Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    if ( !sha ) {
      sha = await gitRevParse( patch.repo, 'HEAD' );
      console.log( `SHA not provided, detecting SHA: ${sha}` );
    }

    patch.shas.push( sha );

    maintenance.save();

    console.log( `Added SHA ${sha} to patch ${patchName}` );
  }

  /**
   * Removes a particular SHA (to cherry-pick) from a patch.
   */
  public static async removePatchSHA( patchName: string, sha: string ): Promise<void> {
    const maintenance = Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    const index = patch.shas.indexOf( sha );
    assert( index >= 0, 'SHA not found' );

    patch.shas.splice( index, 1 );

    maintenance.save();

    console.log( `Removed SHA ${sha} from patch ${patchName}` );
  }

  /**
   * Removes all patch SHAs for a particular patch.
   */
  public static async removeAllPatchSHAs( patchName: string ): Promise<void> {
    const maintenance = Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    for ( const sha of patch.shas ) {
      console.log( `Removing SHA ${sha} from patch ${patchName}` );
    }

    patch.shas.length = 0;

    maintenance.save();
  }

  /**
   * Adds a needed patch to a given modified branch.
   */
  public static async addNeededPatch( repo: string, branch: string, patchName: string ): Promise<void> {
    const maintenance = Maintenance.load();
    assert( repo !== patchName, 'Cannot patch a release branch repo, yet.' ); // TODO: remove in https://github.com/phetsims/perennial/issues/312

    const patch = maintenance.findPatch( patchName );

    const modifiedBranch = await maintenance.ensureModifiedBranch( repo, branch );
    modifiedBranch.neededPatches.push( patch );

    maintenance.save();

    console.log( `Added patch ${patchName} as needed for ${repo} ${branch}` );
  }

  /**
   * Adds a needed patch to a given release branch
   */
  public static async addNeededPatchReleaseBranch( releaseBranch: ReleaseBranch, patchName: string ): Promise<void> {
    const maintenance = Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    const modifiedBranch = new ModifiedBranch( releaseBranch );
    maintenance.modifiedBranches.push( modifiedBranch );
    modifiedBranch.neededPatches.push( patch );
    maintenance.save();

    console.log( `Added patch ${patchName} as needed for ${releaseBranch.repo} ${releaseBranch.branch}` );
  }

  /**
   * Adds a needed patch to whatever subset of release branches match the filter.
   */
  public static async addNeededPatches( patchName: string, filter: FilterRB ): Promise<void> {

    // getMaintenanceBranches needs to cache its branches and maintenance.save() them, so do it before loading
    // Maintenance for this function.
    const releaseBranches = await Maintenance.getMaintenanceBranches();
    const maintenance = Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    let count = 0;

    for ( const releaseBranch of releaseBranches ) {
      const needsPatch = await filter( releaseBranch );

      if ( !needsPatch ) {
        console.log( `  skipping ${releaseBranch.repo} ${releaseBranch.branch}` );
        continue;
      }

      const modifiedBranch = await maintenance.ensureModifiedBranch( releaseBranch.repo, releaseBranch.branch, false, releaseBranches );
      if ( !modifiedBranch.neededPatches.includes( patch ) ) {
        modifiedBranch.neededPatches.push( patch );
        console.log( `Added needed patch ${patchName} to ${releaseBranch.repo} ${releaseBranch.branch}` );
        count++;
        maintenance.save(); // save here in case a future failure would "revert" things
      }
      else {
        console.log( `Patch ${patchName} already included in ${releaseBranch.repo} ${releaseBranch.branch}` );
      }
    }

    console.log( `Added ${count} releaseBranches to patch: ${patchName}` );

    maintenance.save();
  }

  /**
   * Adds a needed patch to all release branches.
   */
  public static async addAllNeededPatches( patchName: string ): Promise<void> {
    await Maintenance.addNeededPatches( patchName, async () => true );
  }

  /**
   * Adds a needed patch to all release branches that do NOT include the given commit on the repo
   */
  public static async addNeededPatchesBefore( patchName: string, sha: string ): Promise<void> {
    const maintenance = Maintenance.load();
    const patch = maintenance.findPatch( patchName );

    await Maintenance.addNeededPatches( patchName, async releaseBranch => {
      return releaseBranch.isMissingSHA( patch.repo, sha );
    } );
  }

  /**
   * Adds a needed patch to all release branches that DO include the given commit on the repo
   */
  public static async addNeededPatchesAfter( patchName: string, sha: string ): Promise<void> {
    const maintenance = Maintenance.load();
    const patch = maintenance.findPatch( patchName );

    await Maintenance.addNeededPatches( patchName, async releaseBranch => {
      return releaseBranch.includesSHA( patch.repo, sha );
    } );
  }

  /**
   * Adds a needed patch to all release branches that satisfy the given filter( releaseBranch, builtFileString )
   * where it builds the simulation with the defaults (brand=phet) and provides it as a string.
   */
  public static async addNeededPatchesBuildFilter( patchName: string, filter: ( releaseBranch: ReleaseBranch, fileContents: string ) => Promise<boolean> ): Promise<void> {
    await Maintenance.addNeededPatches( patchName, async releaseBranch => {
      await checkoutTarget( releaseBranch.repo, releaseBranch.branch, true );
      await gitPull( releaseBranch.repo );
      await build( releaseBranch.repo );
      const chipperVersion = ChipperVersion.getFromRepository();
      let filename;
      if ( chipperVersion.major !== 0 ) {
        filename = `../${releaseBranch.repo}/build/phet/${releaseBranch.repo}_en_phet.html`;
      }
      else {
        filename = `../${releaseBranch.repo}/build/${releaseBranch.repo}_en.html`;
      }
      return filter( releaseBranch, fs.readFileSync( filename, 'utf8' ) );
    } );
  }

  /**
   * Removes a needed patch from a given modified branch.
   */
  public static async removeNeededPatch( repo: string, branch: string, patchName: string ): Promise<void> {
    const maintenance = Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    const modifiedBranch = await maintenance.ensureModifiedBranch( repo, branch );
    const index = modifiedBranch.neededPatches.indexOf( patch );
    assert( index >= 0, 'Could not find needed patch on the modified branch' );

    modifiedBranch.neededPatches.splice( index, 1 );
    maintenance.tryRemovingModifiedBranch( modifiedBranch );

    maintenance.save();

    console.log( `Removed patch ${patchName} from ${repo} ${branch}` );
  }

  /**
   * Removes a needed patch from whatever subset of (current) release branches match the filter.
   */
  public static async removeNeededPatches( patchName: string, filter: FilterRB ): Promise<void> {
    const maintenance = Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    let count = 0;

    for ( const modifiedBranch of maintenance.modifiedBranches ) {
      // Check if there's actually something to remove (for running the potentially-expensive filter function)
      const index = modifiedBranch.neededPatches.indexOf( patch );
      if ( index < 0 ) {
        continue;
      }

      const needsRemoval = await filter( modifiedBranch.releaseBranch );

      if ( !needsRemoval ) {
        console.log( `  skipping ${modifiedBranch.repo} ${modifiedBranch.branch}` );
        continue;
      }

      modifiedBranch.neededPatches.splice( index, 1 );
      maintenance.tryRemovingModifiedBranch( modifiedBranch );
      count++;
      console.log( `Removed needed patch ${patchName} from ${modifiedBranch.repo} ${modifiedBranch.branch}` );
    }
    console.log( `Removed ${count} releaseBranches from patch: ${patchName}` );

    maintenance.save();
  }

  /**
   * Removes a needed patch from all release branches that do NOT include the given commit on the repo
   */
  public static async removeNeededPatchesBefore( patchName: string, sha: string ): Promise<void> {
    const maintenance = Maintenance.load();
    const patch = maintenance.findPatch( patchName );

    await Maintenance.removeNeededPatches( patchName, async releaseBranch => {
      return releaseBranch.isMissingSHA( patch.repo, sha );
    } );
  }

  /**
   * Removes a needed patch from all release branches that DO include the given commit on the repo
   */
  public static async removeNeededPatchesAfter( patchName: string, sha: string ): Promise<void> {
    const maintenance = Maintenance.load();
    const patch = maintenance.findPatch( patchName );

    await Maintenance.removeNeededPatches( patchName, async releaseBranch => {
      return releaseBranch.includesSHA( patch.repo, sha );
    } );
  }

  /**
   * Helper for adding patches based on specific patterns, e.g.:
   * Maintenance.addNeededPatches( 'phetmarks', Maintenance.singleFileReleaseBranchFilter( '../phetmarks/js/phetmarks.ts' ), content => content.includes( 'data/wrappers' ) );
   */
  public static singleFileReleaseBranchFilter( fileName: string, predicate: ( fileContents: string ) => boolean ): FilterRB {
    return async releaseBranch => {
      await releaseBranch.checkout( false );

      if ( fs.existsSync( fileName ) ) {
        const contents = fs.readFileSync( fileName, 'utf-8' );
        return predicate( contents );
      }

      return false;
    };
  }

  /**
   * Checks out a specific Release Branch (using local commit data as necessary).
   * @param repo
   * @param branch
   * @param outputJS - if true, once checked out this will also run `grunt output-js-project`
   * @param npmUpdate - do a npm update after checking out shas
   */
  public static async checkoutBranch( repo: string, branch: string, outputJS = false, npmUpdate = true ): Promise<void> {
    const maintenance = Maintenance.load();

    const modifiedBranch = await maintenance.ensureModifiedBranch( repo, branch, true );
    await modifiedBranch.checkout( npmUpdate );

    if ( outputJS && chipperSupportsOutputJSGruntTasks() ) {
      console.log( 'Running output-js-project' );

      // We might not be able to run this command!
      await execute( gruntCommand, [ 'output-js-project', '--silent' ], `../${repo}`, {
        errors: 'resolve'
      } );
    }

    // No need to save, shouldn't be changing things
    console.log( `Checked out ${repo} ${branch}` );
  }

  /**
   * Attempts to apply patches to the modified branches that are marked as needed.
   */
  public static async applyPatches(): Promise<boolean> {
    winston.info( 'applying patches' );

    let success = true;
    const maintenance = Maintenance.load();
    let numApplied = 0;

    for ( const modifiedBranch of maintenance.modifiedBranches ) {
      if ( modifiedBranch.neededPatches.length === 0 ) {
        continue;
      }

      const repo = modifiedBranch.repo;
      const branch = modifiedBranch.branch;

      let simSuccess = false;

      // Defensive copy, since we modify it during iteration
      for ( const patch of modifiedBranch.neededPatches.slice() ) {
        if ( patch.shas.length === 0 ) {
          continue;
        }

        const patchRepo = patch.repo;

        try {
          let patchRepoCurrentSHA;

          // Checkout whatever the latest patched SHA is (if we've patched it)
          if ( modifiedBranch.changedDependencies[ patchRepo ] ) {
            patchRepoCurrentSHA = modifiedBranch.changedDependencies[ patchRepo ];
          }
          else {
            // Look up the SHA to check out at the tip of the release branch dependencies.json
            await gitCheckout( repo, branch );
            await gitPull( repo );
            const dependencies = await getDependencies( repo );
            patchRepoCurrentSHA = dependencies[ patchRepo ].sha;
            await gitCheckout( repo, 'main' ); // TODO: this assumes we were on main when we started running this. https://github.com/phetsims/perennial/issues/368
            // TODO: see if the patchRepo has a branch for this release branch, and if so, pull it to make sure we have the above SHA https://github.com/phetsims/perennial/issues/368
          }

          // Then check it out
          await gitCheckout( patchRepo, patchRepoCurrentSHA );
          console.log( `Checked out ${patchRepo} for ${repo} ${branch}, SHA: ${patchRepoCurrentSHA}` );

          for ( const sha of patch.shas ) {

            // If the sha doesn't exist in the repo, then give a specific error for that.
            const hasSha = ( await execute( 'git', [ 'cat-file', '-e', sha ], `../${patchRepo}`, { errors: 'resolve' } ) ).code === 0;
            if ( !hasSha ) {
              throw new Error( `SHA not found in ${patchRepo}: ${sha}` );
            }

            const cherryPickSuccess = await gitCherryPick( patchRepo, sha );

            if ( cherryPickSuccess ) {
              const currentSHA = await gitRevParse( patchRepo, 'HEAD' );
              console.log( `Cherry-pick success for ${sha}, result is ${currentSHA}` );
              simSuccess = true;

              modifiedBranch.changedDependencies[ patchRepo ] = currentSHA;
              modifiedBranch.neededPatches.splice( modifiedBranch.neededPatches.indexOf( patch ), 1 );
              numApplied++;

              // Don't include duplicate messages, since multiple patches might be for a single issue
              if ( !modifiedBranch.pendingMessages.includes( patch.message ) ) {
                modifiedBranch.pendingMessages.push( patch.message );
              }

              break;
            }
            else {
              console.log( `Could not cherry-pick ${sha}` );
            }
          }
        }
        catch( e ) {
          maintenance.save();

          throw new Error( `Failure applying patch ${patchRepo} to ${repo} ${branch}: ${e}` );
        }
      }

      await gitCheckout( modifiedBranch.repo, 'main' );
      success = success && simSuccess;
    }

    maintenance.save();

    console.log( `${numApplied} patches applied` );

    return success;
  }

  /**
   * Pushes local changes up to GitHub.
   *
   *
   * @param filter - Optional filter, modified branches will be skipped if this resolves to false
   */
  public static async updateDependencies( filter?: FilterMB ): Promise<void> {
    winston.info( 'update dependencies' );

    const maintenance = Maintenance.load();

    for ( const modifiedBranch of maintenance.modifiedBranches ) {
      const changedRepos = Object.keys( modifiedBranch.changedDependencies );
      if ( changedRepos.length === 0 ) {
        continue;
      }

      if ( filter && !( await filter( modifiedBranch ) ) ) {
        console.log( `Skipping dependency update for ${modifiedBranch.repo} ${modifiedBranch.branch}` );
        continue;
      }

      try {
        // No NPM needed
        await checkoutTarget( modifiedBranch.repo, modifiedBranch.branch, false );
        console.log( `Checked out ${modifiedBranch.repo} ${modifiedBranch.branch}` );

        const dependenciesJSONFile = `../${modifiedBranch.repo}/dependencies.json`;
        const dependenciesJSON = JSON.parse( fs.readFileSync( dependenciesJSONFile, 'utf-8' ) );

        // Modify the "self" in the dependencies.json as expected
        dependenciesJSON[ modifiedBranch.repo ].sha = await gitRevParse( modifiedBranch.repo, modifiedBranch.branch );

        for ( const dependency of changedRepos ) {
          const dependencyBranch = modifiedBranch.dependencyBranch;
          const branches = await getBranches( dependency );
          const sha = modifiedBranch.changedDependencies[ dependency ];

          dependenciesJSON[ dependency ].sha = sha;

          if ( branches.includes( dependencyBranch ) ) {
            console.log( `Branch ${dependencyBranch} already exists in ${dependency}` );
            await gitCheckout( dependency, dependencyBranch );
            await gitPull( dependency );
            const currentSHA = await gitRevParse( dependency, 'HEAD' );

            if ( sha !== currentSHA ) {
              console.log( `Attempting to (hopefully fast-forward) merge ${sha}` );
              await execute( 'git', [ 'merge', sha ], `../${dependency}` );
              await gitPush( dependency, dependencyBranch );
            }
          }
          else {
            console.log( `Branch ${dependencyBranch} does not exist in ${dependency}, creating.` );
            await gitCheckout( dependency, sha );
            await gitCreateBranch( dependency, dependencyBranch );
            await gitPush( dependency, dependencyBranch );
          }

          delete modifiedBranch.changedDependencies[ dependency ];
          modifiedBranch.deployedVersion = null;
          maintenance.save(); // save here in case a future failure would "revert" things
        }

        const message = modifiedBranch.pendingMessages.join( ' and ' );
        fs.writeFileSync( dependenciesJSONFile, JSON.stringify( dependenciesJSON, null, 2 ) );
        await gitAdd( modifiedBranch.repo, 'dependencies.json' );
        await gitCommit( modifiedBranch.repo, `updated dependencies.json for ${message}` );
        await gitPush( modifiedBranch.repo, modifiedBranch.branch );

        // Move messages from pending to pushed
        for ( const message of modifiedBranch.pendingMessages ) {
          if ( !modifiedBranch.pushedMessages.includes( message ) ) {
            modifiedBranch.pushedMessages.push( message );
          }
        }
        modifiedBranch.pendingMessages.length = 0;
        maintenance.save(); // save here in case a future failure would "revert" things

        await checkoutMain( modifiedBranch.repo, false );
      }
      catch( e ) {
        maintenance.save();

        throw new Error( `Failure updating dependencies for ${modifiedBranch.repo} to ${modifiedBranch.branch}: ${e}` );
      }
    }

    maintenance.save();

    console.log( 'Dependencies updated' );
  }

  /**
   * Deploys RC versions of the modified branches that need it.
   *
   *
   * @param filter - Optional filter, modified branches will be skipped if this resolves to false
   */
  public static async deployReleaseCandidates( filter?: FilterMB ): Promise<void> {
    const maintenance = Maintenance.load();

    for ( const modifiedBranch of maintenance.modifiedBranches ) {
      if ( !modifiedBranch.isReadyForReleaseCandidate || !modifiedBranch.releaseBranch.isReleased ) {
        continue;
      }

      console.log( '================================================' );

      if ( filter && !( await filter( modifiedBranch ) ) ) {
        console.log( `Skipping RC deploy for ${modifiedBranch.repo} ${modifiedBranch.branch}` );
        continue;
      }

      try {
        console.log( `Running RC deploy for ${modifiedBranch.repo} ${modifiedBranch.branch}` );

        const version = await rc( modifiedBranch.repo, modifiedBranch.branch, modifiedBranch.brands, true, modifiedBranch.pushedMessages.join( ', ' ) );
        modifiedBranch.deployedVersion = version;
        maintenance.save(); // save here in case a future failure would "revert" things
      }
      catch( e ) {
        maintenance.save();

        console.error( `Failure with RC deploy for ${modifiedBranch.repo} to ${modifiedBranch.branch}: ${e}` );
      }
    }

    maintenance.save();

    console.log( 'RC versions deployed' );
  }

  /**
   * Deploys production versions of the modified branches that need it.
   * @param filter - Optional filter, modified branches will be skipped if this resolves to false
   */
  public static async deployProduction( filter: FilterMB ): Promise<void> {
    const maintenance = Maintenance.load();

    for ( const modifiedBranch of maintenance.modifiedBranches ) {
      if ( !modifiedBranch.isReadyForProduction || !modifiedBranch.releaseBranch.isReleased ) {
        continue;
      }

      if ( filter && !( await filter( modifiedBranch ) ) ) {
        console.log( `Skipping production deploy for ${modifiedBranch.repo} ${modifiedBranch.branch}` );
        continue;
      }

      try {
        console.log( `Running production deploy for ${modifiedBranch.repo} ${modifiedBranch.branch}` );

        const version = await production( modifiedBranch.repo, modifiedBranch.branch, modifiedBranch.brands, true, false, modifiedBranch.pushedMessages.join( ', ' ) );
        modifiedBranch.deployedVersion = version;
        modifiedBranch.pushedMessages.length = 0;
        maintenance.save(); // save here in case a future failure would "revert" things
      }
      catch( e ) {
        maintenance.save();

        throw new Error( `Failure with production deploy for ${modifiedBranch.repo} to ${modifiedBranch.branch}: ${e}` );
      }
    }

    maintenance.save();

    console.log( 'production versions deployed' );
  }

  /**
   * Create a separate directory for each release branch. This does not interface with the saved maintenance state at
   * all, and instead just looks at the committed dependencies.json when updating.
   *
   *
   * @param filter - Optional filter, release branches will be skipped if this resolves to false
   * @param providedOptions
   */
  public static async updateCheckouts( filter?: FilterRB, providedOptions?: Partial<UpdateCheckoutsOptions> ): Promise<void> {
    const options = _.merge( {
      concurrent: 5,
      build: true,
      transpile: true,
      buildOptions: { lint: true }
    }, providedOptions );

    console.log( `Updating checkouts (running in parallel with ${options.concurrent} threads)` );

    const releaseBranches = await Maintenance.getMaintenanceBranches();

    const filteredBranches = [];

    // Run all filtering in a step before the parallel step. This way the filter has full access to repos and git commands without race conditions, https://github.com/phetsims/perennial/issues/341
    for ( const releaseBranch of releaseBranches ) {
      if ( !filter || await filter( releaseBranch ) ) {
        filteredBranches.push( releaseBranch );
      }
    }

    console.log( `Filter applied. Updating ${filteredBranches.length}:`, filteredBranches.map( x => x.toString() ) );

    const asyncFunctions = filteredBranches.map( releaseBranch => ( async () => {
      console.log( 'Beginning: ', releaseBranch.toString() );
      try {

        await releaseBranch.updateCheckout();

        options.transpile && await releaseBranch.transpile();
        try {
          options.build && await releaseBranch.build( options.buildOptions );
          console.log( 'Finished: ', releaseBranch.toString() );
        }
        catch( e ) {
          console.log( `failed to build ${releaseBranch.toString()}: ${e}` );
        }
      }
      catch( e ) {
        console.log( `failed to update releaseBranch ${releaseBranch.toString()}: ${e}` );
      }
    } ) );

    await asyncQ.parallelLimit( asyncFunctions, options.concurrent );

    console.log( 'Done' );
  }

  /**
   * @param filter - Optional filter, release branches will be skipped if this resolves to false
   */
  public static async checkUnbuiltCheckouts( filter: FilterRB ): Promise<void> {
    console.log( 'Checking unbuilt checkouts' );

    const releaseBranches = await Maintenance.getMaintenanceBranches();
    for ( const releaseBranch of releaseBranches ) {
      if ( !filter || await filter( releaseBranch ) ) {
        console.log( releaseBranch.toString() );
        const unbuiltResult = await releaseBranch.checkUnbuilt();
        if ( unbuiltResult ) {
          console.log( unbuiltResult );
        }
      }
    }
  }

  /**
   * @param filter - Optional filter, release branches will be skipped if this resolves to false
   */
  public static async checkBuiltCheckouts( filter?: FilterRB ): Promise<void> {
    console.log( 'Checking built checkouts' );

    const releaseBranches = await Maintenance.getMaintenanceBranches();
    for ( const releaseBranch of releaseBranches ) {
      if ( !filter || await filter( releaseBranch ) ) {
        console.log( releaseBranch.toString() );
        const builtResult = await releaseBranch.checkBuilt();
        if ( builtResult ) {
          console.log( builtResult );
        }
      }
    }
  }

  /**
   * Redeploys production versions of all release branches (or those matching a specific filter
   *
   *
   * NOTE: This does not use the current maintenance state!
   * @param message - Generally an issue to reference
   * @param filter - Optional filter, release branches will be skipped if this resolves to false
   */
  public static async redeployAllProduction( message: string, filter?: FilterRB ): Promise<void> {
    // Ignore unreleased branches!
    const releaseBranches = await Maintenance.getMaintenanceBranches( () => true, false );

    for ( const releaseBranch of releaseBranches ) {
      if ( filter && !( await filter( releaseBranch ) ) ) {
        continue;
      }

      console.log( releaseBranch.toString() );
      await rc( releaseBranch.repo, releaseBranch.branch, releaseBranch.brands, true, message );
      await production( releaseBranch.repo, releaseBranch.branch, releaseBranch.brands, true, false, message );
    }

    console.log( 'Finished redeploying' );
  }

  /**
   * The prototype copy of Maintenance.getMaintenanceBranches(), in which we will mutate the class's allReleaseBranches
   * to ensure there is no save/load order dependency problems.
   *
   *
   * @param filter - return false if the ReleaseBranch should be excluded.
   * @param checkUnreleasedBranches - If false, will skip checking for unreleased branches. This checking needs all repos checked out
   * @param forceCacheBreak - true if you want to force a recalculation of all ReleaseBranches
   * @rejects {ExecuteError}
   */
  public async getMaintenanceBranches( filter: FilterSyncRB = () => true, checkUnreleasedBranches = true, forceCacheBreak = false ): Promise<ReleaseBranch[]> {
    return Maintenance.getMaintenanceBranches( filter, checkUnreleasedBranches, forceCacheBreak, this );
  }

  /**
   *
   * @param filter - return false if the ReleaseBranch should be excluded.
   * @param checkUnreleasedBranches - If false, will skip checking for unreleased branches. This checking needs all repos checked out
   * @param forceCacheBreak - true if you want to force a recalculation of all ReleaseBranches
   * @param maintenance - by default load from saved file the current maintenance instance.
   * @rejects {ExecuteError}
   */
  public static async getMaintenanceBranches( filter: FilterSyncRB = () => true,
                                              checkUnreleasedBranches = true,
                                              forceCacheBreak = false,
                                              maintenance = Maintenance.load() ): Promise<ReleaseBranch[]> {
    const releaseBranches = await Maintenance.loadAllMaintenanceBranches( forceCacheBreak, maintenance );

    return releaseBranches.filter( releaseBranch => {
      if ( !checkUnreleasedBranches && !releaseBranch.isReleased ) {
        return false;
      }
      return filter( releaseBranch );
    } );
  }

  /**
   * Loads every potential ReleaseBranch (published phet and phet-io brands, as well as unreleased branches), and
   * saves it to the maintenance state.
   *
   *
   * Call this with true to break the cache and force a recalculation of all ReleaseBranches
   * @param forceCacheBreak - true if you want to force a recalculation of all ReleaseBranches
   * @param maintenance - by default load from saved file the current maintenance instance.
   */
  public static async loadAllMaintenanceBranches( forceCacheBreak = false, maintenance = Maintenance.load() ): Promise<ReleaseBranch[]> {

    let releaseBranches = null;
    if ( maintenance.allReleaseBranches.length > 0 && !forceCacheBreak ) {
      assert( maintenance.allReleaseBranches[ 0 ] instanceof ReleaseBranch, 'deserialization check' );
      releaseBranches = maintenance.allReleaseBranches;
    }
    else {

      // cache miss
      releaseBranches = await ReleaseBranch.getAllMaintenanceBranches();
      // eslint-disable-next-line require-atomic-updates
      maintenance.allReleaseBranches = releaseBranches;
      maintenance.save();
    }

    return releaseBranches;
  }

  /**
   * Convert into a plain JS object meant for JSON serialization.
   */
  public serialize(): MaintenanceSerialized {
    return {
      patches: this.patches.map( patch => patch.serialize() ),
      modifiedBranches: this.modifiedBranches.map( modifiedBranch => modifiedBranch.serialize() ),
      allReleaseBranches: this.allReleaseBranches.map( releaseBranch => releaseBranch.serialize() )
    };
  }

  /**
   * Takes a serialized form of the Maintenance and returns an actual instance.
   */
  public static deserialize( { patches = [], modifiedBranches = [], allReleaseBranches = [] }: MaintenanceSerialized ): Maintenance {
    // Pass in patch references to branch deserialization
    const deserializedPatches = patches.map( Patch.deserialize );
    const modifiedBranchesDeserialized = modifiedBranches.map( modifiedBranch => ModifiedBranch.deserialize( modifiedBranch, deserializedPatches ) );
    modifiedBranchesDeserialized.sort( ( a, b ) => {
      if ( a.repo !== b.repo ) {
        return a.repo < b.repo ? -1 : 1;
      }
      if ( a.branch !== b.branch ) {
        return a.branch < b.branch ? -1 : 1;
      }
      return 0;
    } );
    const deserializedReleaseBranches = allReleaseBranches.map( releaseBranch => ReleaseBranch.deserialize( releaseBranch ) );

    return new Maintenance( deserializedPatches, modifiedBranchesDeserialized, deserializedReleaseBranches );
  }

  /**
   * Saves the state of this object into the maintenance file.
   */
  public save(): void {
    return fs.writeFileSync( MAINTENANCE_FILE, JSON.stringify( this.serialize(), null, 2 ) );
  }

  /**
   * Loads a new Maintenance object (if possible) from the maintenance file.
   */
  public static load(): Maintenance {
    if ( fs.existsSync( MAINTENANCE_FILE ) ) {
      return Maintenance.deserialize( JSON.parse( fs.readFileSync( MAINTENANCE_FILE, 'utf8' ) ) );
    }
    else {
      return new Maintenance();
    }
  }

  /**
   * Starts a command-line REPL with features loaded.
   */
  public static startREPL(): Promise<void> {
    return new Promise( ( resolve, reject ) => {
      winston.default.transports.console.level = 'error';

      const session = repl.start( {
        prompt: 'maintenance> ',
        useColors: true,
        replMode: repl.REPL_MODE_STRICT,
        ignoreUndefined: true
      } );

      // Wait for promises before being ready for input
      const nodeEval = session.eval;
      // @ts-expect-error - docs say readonly, but MK isn't going to change this working code
      session[ 'eval' ] = // eslint-disable-line @typescript-eslint/dot-notation
        ( async ( cmd, context, filename, callback ) => {
          nodeEval.call( session, cmd, context, filename, ( _, result ) => {
            if ( result instanceof Promise ) {
              result.then( val => callback( _, val ) ).catch( e => {
                if ( e.stack ) {
                  console.error( `Maintenance task failed:\n${e.stack}\nFull Error details:\n${JSON.stringify( e, null, 2 )}` );
                }
                else if ( typeof e === 'string' ) {
                  console.error( `Maintenance task failed: ${e}` );
                }
                else {
                  console.error( `Maintenance task failed with unknown error: ${JSON.stringify( e, null, 2 )}` );
                }
              } );
            }
            else {
              callback( _, result );
            }
          } );
        } ) as typeof session.eval;

      // Only autocomplete "public" API functions for Maintenance.
      // const nodeCompleter = session.completer;
      // session.completer = function( text, cb ) {
      //   nodeCompleter( text, ( _, [ completions, completed ] ) => {
      //     const match = completed.match( /^Maintenance\.(\w*)+/ );
      //     if ( match ) {
      //       const funcStart = match[ 1 ];
      //       cb( null, [ PUBLIC_FUNCTIONS.filter( f => f.startsWith( funcStart ) ).map( f => `Maintenance.${f}` ), completed ] );
      //     }
      //     else {
      //       cb( null, [ completions, completed ] );
      //     }
      //   } );
      // };

      // Allow controlling verbosity
      Object.defineProperty( global, 'verbose', {
        get() {
          return winston.default.transports.console.level === 'info';
        },
        set( value ) {
          winston.default.transports.console.level = value ? 'info' : 'error';
        }
      } );

      session.context.Maintenance = Maintenance;
      session.context.m = Maintenance;
      session.context.M = Maintenance;
      session.context.ReleaseBranch = ReleaseBranch;
      session.context.rb = ReleaseBranch;

      session.on( 'exit', resolve );
    } );
  }

  /**
   * Looks up a patch by its name.
   */
  public findPatch( patchName: string ): Patch {
    // TODO: assert if two patches have the same name, https://github.com/phetsims/perennial/issues/369
    const patch = this.patches.find( p => p.name === patchName );
    assert( patch, `Patch not found for ${patchName}` );

    return patch;
  }

  /**
   * Looks up (or adds) a ModifiedBranch by its identifying information.
   * @param repo
   * @param branch
   * @param [errorIfMissing]
   * @param [releaseBranches] - If provided, it will speed up the process
   */
  public async ensureModifiedBranch( repo: string, branch: string, errorIfMissing = false, releaseBranches: ReleaseBranch[] | null = null ): Promise<ModifiedBranch> {
    let modifiedBranch = this.modifiedBranches.find( modifiedBranch => modifiedBranch.repo === repo && modifiedBranch.branch === branch );

    if ( !modifiedBranch ) {
      if ( errorIfMissing ) {
        throw new Error( `Could not find a tracked modified branch for ${repo} ${branch}` );
      }

      // Use the instance version of getMaintenanceBranches to make sure that this Maintenance instance is updated with new ReleaseBranches.
      releaseBranches = releaseBranches || await this.getMaintenanceBranches( releaseBranch => releaseBranch.repo === repo );
      const releaseBranch = releaseBranches.find( release => release.repo === repo && release.branch === branch );
      assert( releaseBranch, `Could not find a release branch for repo=${repo} branch=${branch}` );

      modifiedBranch = new ModifiedBranch( releaseBranch );

      // If we are creating it, add it to our list.
      this.modifiedBranches.push( modifiedBranch );
    }

    return modifiedBranch;
  }

  /**
   * Attempts to remove a modified branch (if it doesn't need to be kept around).
   */
  public tryRemovingModifiedBranch( modifiedBranch: ModifiedBranch ): void {
    if ( modifiedBranch.isUnused ) {
      const index = this.modifiedBranches.indexOf( modifiedBranch );
      assert( index >= 0 );

      this.modifiedBranches.splice( index, 1 );
    }
  }
}

export default Maintenance;