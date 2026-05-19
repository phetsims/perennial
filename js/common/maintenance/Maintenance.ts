// Copyright 2018-2026, University of Colorado Boulder

/**
 * The main persistent state-bearing object for maintenance releases. Can be loaded from or saved to a dedicated file.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import assert from 'assert';
import fs from 'fs';
import _ from 'lodash';
import winston from 'winston';
import { production } from '../../grunt/production.js';
import { rc } from '../../grunt/rc.js';
import { DeployedLinkOptions, ModifiedBranch } from './ModifiedBranch.js';
import { ReleaseBranch } from '../ReleaseBranch.js';
import { Patch } from './Patch.js';
import { Checkout } from '../Checkout.js';
import { LegacyBranch, Repo, SHA } from '../../browser-and-node/PerennialTypes.js';
import { gitImmutableExecute } from '../gitMutex.js';
import { buildLocal } from '../buildLocal.js';

// constants
const MAINTENANCE_FILE = '.maintenance.json';

type MaintenanceSerialized = {
  patches: ReturnType<Patch['serialize']>[];
  modifiedBranches: ReturnType<ModifiedBranch['serialize']>[];
};

type FilterSyncRB = ( releaseBranch: ReleaseBranch ) => boolean;
type FilterSyncMB = ( releaseBranch: ModifiedBranch ) => boolean;
type FilterRB = ( releaseBranch: ReleaseBranch ) => Promise<boolean>;
type FilterMB = ( releaseBranch: ModifiedBranch ) => Promise<boolean>;

// We will cache release branches in memory (Maintenance tooling can be restarted to get another set)
const allReleaseBranchesPromise = Checkout.getMaintainedReleaseBranches();
allReleaseBranchesPromise.then( releaseBranches => {
  console.log( `loaded ${releaseBranches.length} release branches` );
} ).catch( e => {
  console.error( `Error loading release branches: ${e}` );
} );

export class Maintenance {
  public constructor(
    public readonly patches: Patch[] = [],
    public readonly modifiedBranches: ModifiedBranch[] = [],
    public allReleaseBranches: ReleaseBranch[] = []
  ) {}

  /**
   * Resets ALL the maintenance state to a default "blank" state.
   *
   * @param keepCachedReleaseBranches - allReleaseBranches take a while to populate, and have little to do
   *                                    with the current MR, so optionally keep them in storage.
   *
   * CAUTION: This will remove any information about any ongoing/complete maintenance release from your
   * .maintenance.json. Generally this should be done before any new maintenance release.
   */
  public static async reset( keepCachedReleaseBranches = false ): Promise<void> {
    console.log(
      'PhET-iO simulations require maintaining older release branches. ' +
      'If you are patching specific simulations, use `grunt release-branch-list` ' +
      'in perennial to generate the list of branches that require patching.'
    );

    const allReleaseBranches = [];
    if ( keepCachedReleaseBranches ) {
      const maintenance = await Maintenance.load();
      allReleaseBranches.push( ...maintenance.allReleaseBranches );
    }
    new Maintenance( [], [], allReleaseBranches ).save();
  }

  /**
   * Runs a number of checks through every release branch.
   *
   * @param filter - Optional filter, release branches will be skipped if this resolves to false
   */
  public static async checkBranchStatus( filter?: FilterSyncRB ): Promise<void> {
    // TODO: add checks to see if release branches have a last commit that is a "post-deploy" commit (!) https://github.com/phetsims/totality/issues/140
    // TODO: This will likely be done AFTER we do everything else https://github.com/phetsims/totality/issues/140

    // TODO: .... nothing else to do, right? https://github.com/phetsims/totality/issues/140

    console.log( 'no checks done, TODO' );
  }

  /**
   * Displays a listing of the current maintenance status.
   *
   * If timestamp:true is provided, it will include timestamps for when the branches diverged from main, and sort by those timestamps.
   * This is useful for prioritizing which branches to patch first.
   */
  public static async list( options?: { timestamp?: boolean } ): Promise<void> {
    const maintenance = await Maintenance.load();

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
    }

    console.log( '\nMaintenance Patches in MR:', maintenance.patches.length === 0 ? 'None' : '' );

    for ( const patch of maintenance.patches ) {
      const count = maintenance.patches.indexOf( patch ) + 1;
      const indexAndSpacing = `${count}. ` + ( count > 9 ? '' : ' ' );

      console.log( `${indexAndSpacing}[${patch.name}]${patch.name} ${patch.message}` );
      for ( const sha of patch.shas ) {
        console.log( `      ${sha}` );
      }

      let modifiedBranches = maintenance.modifiedBranches;
      if ( options?.timestamp ) {
        // Do a parallel update of cached timestamps on the modified branches, so that we can sort by them.
        await Promise.all( modifiedBranches.map( modifiedBranch => {
          return ( async () => {
            if ( !modifiedBranch.releaseBranch.cachedTimestampString ) {
              // eslint-disable-next-line require-atomic-updates
              modifiedBranch.releaseBranch.cachedTimestampString = await modifiedBranch.releaseBranch.checkout.getDivergingTimestampString();
            }
          } )();
        } ) );

        modifiedBranches = _.sortBy( modifiedBranches, modifiedBranch => {
          return modifiedBranch.releaseBranch.cachedTimestampString;
        } );
      }

      for ( const modifiedBranch of modifiedBranches ) {
        if ( modifiedBranch.neededPatches.includes( patch ) ) {
          const timestampPrefix = options?.timestamp ? `${modifiedBranch.releaseBranch.cachedTimestampString} ` : '';
          console.log( `        ${timestampPrefix}${modifiedBranch.repo} ${modifiedBranch.branch} ${modifiedBranch.brands.join( ',' )}` );
        }
      }
    }

    console.log( '\n(list complete)' );
  }

  /**
   * A convenience function for list() with timestamp: true. Sorts needed-patch branches by branch date
   */
  public static async timestampList(): Promise<void> {
    await this.list( { timestamp: true } );
  }

  /**
   * Shows any required testing links for the simulations.
   * @param filter - Control which branches are shown
   * @param options - options for including specific links
   */
  public static async listLinks( filter: FilterSyncMB = () => true, options?: DeployedLinkOptions ): Promise<void> {
    const maintenance = await Maintenance.load();

    const deployedBranches = maintenance.modifiedBranches.filter( modifiedBranch => !!modifiedBranch.deployedVersion && filter( modifiedBranch ) );
    const productionBranches = deployedBranches.filter( modifiedBranch => modifiedBranch.deployedVersion?.testType === null );
    const releaseCandidateBranches = deployedBranches.filter( modifiedBranch => modifiedBranch.deployedVersion?.testType === 'rc' );

    if ( productionBranches.length ) {
      console.log( '\nProduction links\n' );

      for ( const modifiedBranch of productionBranches ) {
        const links = await modifiedBranch.getDeployedLinkLines( options );
        for ( const link of links ) {
          console.log( link );
        }
      }
    }

    if ( releaseCandidateBranches.length ) {
      console.log( '\nRelease Candidate links\n' );

      for ( const modifiedBranch of releaseCandidateBranches ) {
        const links = await modifiedBranch.getDeployedLinkLines( options );
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
    const maintenance = await Maintenance.load();

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
   */
  public static async createPatch( patchName: string, message: string ): Promise<void> {
    if ( !message.includes( 'http' ) ) {
      throw new Error( 'createPatch( patchName, message ), changed API' );
    }

    const maintenance = await Maintenance.load();

    for ( const patch of maintenance.patches ) {
      if ( patch.name === patchName ) {
        throw new Error( 'Multiple patches with the same name are not concurrently supported' );
      }
    }

    maintenance.patches.push( new Patch( patchName, message ) );

    maintenance.save();

    console.log( `Created patch ${patchName} with message: ${message}` );
  }

  /**
   * Removes a patch
   */
  public static async removePatch( patchName: string ): Promise<void> {
    const maintenance = await Maintenance.load();

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
  public static async addPatchSHA( patchName: string, sha: SHA ): Promise<void> {
    const maintenance = await Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    patch.shas.push( sha );

    maintenance.save();

    console.log( `Added SHA ${sha} to patch ${patchName}` );
  }

  /**
   * Removes a particular SHA (to cherry-pick) from a patch.
   */
  public static async removePatchSHA( patchName: string, sha: SHA ): Promise<void> {
    const maintenance = await Maintenance.load();

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
    const maintenance = await Maintenance.load();

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
  public static async addNeededPatch( repo: Repo, branch: LegacyBranch, patchName: string ): Promise<void> {
    const maintenance = await Maintenance.load();
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
    const maintenance = await Maintenance.load();

    const patch = maintenance.findPatch( patchName );

    // Use an ensured modified branch instead of creating one directly.
    const modifiedBranch = await maintenance.ensureModifiedBranch( releaseBranch.repo, releaseBranch.branch );
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
    const maintenance = await Maintenance.load();

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
  public static async addNeededPatchesBefore( patchName: string, sha: SHA ): Promise<void> {
    await Maintenance.addNeededPatches( patchName, async releaseBranch => {
      return releaseBranch.checkout.isMissingSHA( sha );
    } );
  }

  /**
   * Adds a needed patch to all release branches that DO include the given commit on the repo
   */
  public static async addNeededPatchesAfter( patchName: string, sha: SHA ): Promise<void> {
    await Maintenance.addNeededPatches( patchName, async releaseBranch => {
      return releaseBranch.checkout.includesSHA( sha );
    } );
  }

  /**
   * Removes a needed patch from a given modified branch.
   */
  public static async removeNeededPatch( repo: Repo, branch: LegacyBranch, patchName: string ): Promise<void> {
    const maintenance = await Maintenance.load();

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
    const maintenance = await Maintenance.load();

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
  public static async removeNeededPatchesBefore( patchName: string, sha: SHA ): Promise<void> {
    await Maintenance.removeNeededPatches( patchName, async releaseBranch => {
      return releaseBranch.checkout.isMissingSHA( sha );
    } );
  }

  /**
   * Removes a needed patch from all release branches that DO include the given commit on the repo
   */
  public static async removeNeededPatchesAfter( patchName: string, sha: SHA ): Promise<void> {
    await Maintenance.removeNeededPatches( patchName, async releaseBranch => {
      return releaseBranch.checkout.includesSHA( sha );
    } );
  }

  /**
   * Attempts to apply patches to the modified branches that are marked as needed.
   */
  public static async applyPatches(): Promise<boolean> {
    winston.info( 'applying patches' );

    let success = true;
    const maintenance = await Maintenance.load();
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

        try {
          for ( const sha of patch.shas ) {
            const cherryPickSuccess = await modifiedBranch.releaseBranch.checkout.gitCherryPick( sha );

            if ( cherryPickSuccess ) {
              const currentSHA = await modifiedBranch.releaseBranch.checkout.getSHA();
              console.log( `Cherry-pick success for ${sha}, result is ${currentSHA}` );
              simSuccess = true;

              modifiedBranch.neededPatches.splice( modifiedBranch.neededPatches.indexOf( patch ), 1 );
              numApplied++;

              // Don't include duplicate messages, since multiple patches might be for a single issue
              if ( !modifiedBranch.pushedMessages.includes( patch.message ) ) {
                modifiedBranch.pushedMessages.push( patch.message );
              }

              console.log( 'pushing' );
              await modifiedBranch.releaseBranch.checkout.gitPush();

              break;
            }
            else {
              console.log( `Could not cherry-pick ${sha}` );
            }
          }
        }
        catch( e ) {
          maintenance.save();

          throw new Error( `Failure applying patch ${patch.name} to ${repo} ${branch}: ${e}` );
        }
      }

      success = success && simSuccess;
    }

    maintenance.save();

    console.log( `${numApplied} patches applied` );

    return success;
  }

  /**
   * Deploys RC versions of the modified branches that need it.
   *
   *
   * @param filter - Optional filter, modified branches will be skipped if this resolves to false
   */
  public static async deployReleaseCandidates( filter?: FilterMB, skipBuild = false ): Promise<void> {
    const maintenance = await Maintenance.load();

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

        const version = await rc( modifiedBranch.repo, modifiedBranch.branch, {
          noninteractive: true,
          message: modifiedBranch.pushedMessages.join( ', ' ),
          skipBuild: skipBuild
        } );
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
  public static async deployProduction( filter: FilterMB, skipBuild = true ): Promise<void> {
    const maintenance = await Maintenance.load();

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

        const version = await production( modifiedBranch.repo, modifiedBranch.branch, {
          noninteractive: true,
          message: modifiedBranch.pushedMessages.join( ', ' ),
          skipBuild: skipBuild
        } );
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
      await rc( releaseBranch.repo, releaseBranch.branch, {
        noninteractive: true,
        message: message,
        skipBuild: true
      } );
      await production( releaseBranch.repo, releaseBranch.branch, {
        noninteractive: true,
        message: message,
        skipBuild: true
      } );
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
  public static async getMaintenanceBranches(
    filter: FilterSyncRB = () => true,
    checkUnreleasedBranches = true,
    forceCacheBreak = false,
    maintenance?: Maintenance
  ): Promise<ReleaseBranch[]> {

    if ( !maintenance ) {
      maintenance = await Maintenance.load();
    }

    const releaseBranches = await allReleaseBranchesPromise;

    return releaseBranches.filter( releaseBranch => {
      if ( !checkUnreleasedBranches && !releaseBranch.isReleased ) {
        return false;
      }
      return filter( releaseBranch );
    } );
  }

  /**
   * Used to fix BUGGY situations (multiple ModifiedBranch objects for the same actual release branch).
   * NOT NEEDED FOR NORMAL USE.
   *
   * Don't use this unless you've talked with JO about the consequences. He had horribly duplicated ModifiedBranches due
   * to addNeededPatchReleaseBranch creating many copies. This may be useful in the future if similar types of issues
   * happen. Fun fact, you can't remove needed patches if this happens. RIP the 2026 CC BY-NC release, you will be missed.
   * Never forget "deduplicated from 933 to 151".
   */
  public static async fixDuplicatedModifiedBranches(): Promise<void> {
    const maintenance = await Maintenance.load();

    const modifiedBranchMap: Record<string, ModifiedBranch> = {};

    const startingCount = maintenance.modifiedBranches.length;

    for ( const modifiedBranch of maintenance.modifiedBranches ) {
      // Does not include brands. Will fail out on purpose in the combine() later if we have brand mismatches
      const key = `${modifiedBranch.releaseBranch.repo}-${modifiedBranch.releaseBranch.branch}`;

      if ( modifiedBranchMap[ key ] ) {
        modifiedBranchMap[ key ] = modifiedBranchMap[ key ].combine( modifiedBranch );
      }
      else {
        modifiedBranchMap[ key ] = modifiedBranch;
      }
    }

    maintenance.modifiedBranches.length = 0;
    maintenance.modifiedBranches.push( ...Object.values( modifiedBranchMap ) );

    maintenance.save();

    console.log( `deduplicated from ${startingCount} to ${maintenance.modifiedBranches.length}` );
  }

  /**
   * Convert into a plain JS object meant for JSON serialization.
   */
  public serialize(): MaintenanceSerialized {
    return {
      patches: this.patches.map( patch => patch.serialize() ),
      modifiedBranches: this.modifiedBranches.map( modifiedBranch => modifiedBranch.serialize() ),
    };
  }

  /**
   * Takes a serialized form of the Maintenance and returns an actual instance.
   */
  public static async deserialize( { patches = [], modifiedBranches = [] }: MaintenanceSerialized ): Promise<Maintenance> {
    const releaseBranches = ( await allReleaseBranchesPromise ).slice(); // sliced for extra protection

    // Pass in patch references to branch deserialization
    const deserializedPatches = patches.map( Patch.deserialize );
    const modifiedBranchesDeserialized = await Promise.all( modifiedBranches.map( modifiedBranch => ModifiedBranch.deserialize( modifiedBranch, deserializedPatches, releaseBranches ) ) );
    modifiedBranchesDeserialized.sort( ( a, b ) => {
      if ( a.repo !== b.repo ) {
        return a.repo < b.repo ? -1 : 1;
      }
      if ( a.branch !== b.branch ) {
        return a.branch < b.branch ? -1 : 1;
      }
      return 0;
    } );

    return new Maintenance( deserializedPatches, modifiedBranchesDeserialized, releaseBranches );
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
  public static async load(): Promise<Maintenance> {
    if ( fs.existsSync( MAINTENANCE_FILE ) ) {
      return Maintenance.deserialize( JSON.parse( fs.readFileSync( MAINTENANCE_FILE, 'utf8' ) ) );
    }
    else {
      return new Maintenance();
    }
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
  public async ensureModifiedBranch( repo: Repo, branch: LegacyBranch, errorIfMissing = false, releaseBranches: ReleaseBranch[] | null = null ): Promise<ModifiedBranch> {
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

  public async getCheckoutSHA(): Promise<SHA> {
    return ( await gitImmutableExecute( [ 'rev-parse', 'HEAD' ], buildLocal.maintenanceWorktreeDirectory ) ).trim();
  }

  public static maintenanceCheckout: Checkout | null = null;

  public static async checkoutBranch( repo: Repo, branch: LegacyBranch ): Promise<void> {
    const releaseBranch = ( await allReleaseBranchesPromise ).find( releaseBranch => releaseBranch.repo === repo && releaseBranch.branch === branch );

    if ( !releaseBranch ) {
      throw new Error( `Could not find a release branch for repo=${repo} branch=${branch}` );
    }

    const sha = ( await gitImmutableExecute( [ 'rev-parse', Checkout.getReleaseBranchName( repo, branch ) ], '..' ) ).trim();

    const maintenanceCheckout = await Checkout.getMaintenanceCheckout( sha, releaseBranch );

    Maintenance.maintenanceCheckout = maintenanceCheckout;

    await maintenanceCheckout.updateMaintenanceWorktree();

    console.log( `checked out ${sha} for ${repo} ${branch}` );
  }
}
