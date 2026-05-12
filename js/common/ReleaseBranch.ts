// Copyright 2018-2026, University of Colorado Boulder

/**
 * Represents a simulation release branch for deployment
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import axios from 'axios';
import fs from 'fs';
import _ from 'lodash';
import winston from 'winston';
import affirm from '../browser-and-node/affirm.js';
import SimVersion from '../browser-and-node/SimVersion.js';
import Dependencies from '../browser-and-node/types/Dependencies.js';
import { buildLocal } from './buildLocal.js';
import buildServerRequest from './buildServerRequest.js';
import checkoutMain from './checkoutMain.js';
import checkoutTarget from './checkoutTarget.js';
import { chipperSupportsOutputJSGruntTasks } from './chipperSupportsOutputJSGruntTasks.js';
import { ChipperVersion } from './ChipperVersion.js';
import { createDirectory } from './createDirectory.js';
import execute, { ExecuteOptions } from './execute.js';
import { getActiveSims } from './getActiveSims.js';
import getBranchDependencies from './getBranchDependencies.js';
import { getBranchSHAMap } from './getBranchSHAMap.js';
import { getBranchVersion } from './getBranchVersion.js';
import { BuildOptions, getBuildArguments } from './getBuildArguments.js';
import getDependencies from './getDependencies.js';
import { getGitFile } from './getGitFile.js';
import { getRunnableVersion } from './getRunnableVersion.js';
import { gitCatFile } from './gitCatFile.js';
import { gitCheckoutDirectory } from './gitCheckoutDirectory.js';
import gitCloneOrFetchDirectory from './gitCloneOrFetchDirectory.js';
import { gitFirstDivergingCommit } from './gitFirstDivergingCommit.js';
import { gitPullDirectory } from './gitPullDirectory.js';
import { gitRevParse } from './gitRevParse.js';
import { gitTimestamp } from './gitTimestamp.js';
import { gruntCommand } from './gruntCommand.js';
import { loadJSON } from './loadJSON.js';
import { npmUpdateDirectory } from './npmUpdateDirectory.js';
import { puppeteerLoad } from './puppeteerLoad.js';
import simMetadata from './simMetadata.js';
import simPhetioMetadata from './simPhetioMetadata.js';
import withServer from './withServer.js';
import { gitCreateWorktree } from './gitCreateWorktree.js';
import { getBranches } from './getBranches.js';
import { getFileAtBranch } from './getFileAtBranch.js';
import { createLocalBranchFromRemote } from './createLocalBranchFromRemote.js';
import { gitIsAncestor } from './gitIsAncestor.js';
import { getBranchBrands } from './getBranchBrands.js';
import type { Checkout } from './Checkout.js';
import { RunnableBranch } from './RunnableBranch.js';

type ReleaseBranchSerialized = {
  repo: string;
  branch: string;
};

export class ReleaseBranch extends RunnableBranch implements ReleaseBranchSerialized {

  // Cache for the timestamp string of the diverging commit, since it can be expensive to calculate and is used in multiple places.
  public cachedTimestampString: string | null = null;

  public constructor(
    // passed to RunnableBranch
    checkout: Checkout,
    repo: string,

    public readonly branch: string, // TODO: note: rename to legacyBranch?
    brands: string[],
    public readonly isReleased: boolean
  ) {
    super( checkout, repo, brands );

    assert( Array.isArray( brands ) );
  }

  /**
   * Convert into a plain JS object meant for JSON serialization.
   *
   * NOTE: use Checkout.getReleaseBranch to deserialize
   */
  public serialize(): ReleaseBranchSerialized {
    return {
      repo: this.repo,
      branch: this.branch,
    };
  }

  /**
   * Returns whether the two release branches contain identical information.
   */
  public equals( releaseBranch: ReleaseBranch ): boolean {
    return this.repo === releaseBranch.repo &&
           this.branch === releaseBranch.branch &&
           this.brands.join( ',' ) === releaseBranch.brands.join( ',' ) &&
           this.isReleased === releaseBranch.isReleased;
  }

  /**
   * Converts it to a (debuggable) string form.
   */
  public override toString(): string {
    return `${this.repo} ${this.branch} ${this.brands.join( ',' )}${this.isReleased ? '' : ' (unpublished)'}`;
  }

  /**
   * // TODO: UPDATE THIS so it only checks for the last SHA whether it is an "update" deployed message!
   * Returns a list of status messages of anything out-of-the-ordinary
   */
  public async getStatus( getBranchSHAMapAsyncCallback = getBranchSHAMap ): Promise<string[]> {
    const results = [];

    throw new Error( 'unimplemented' );

    return results;
  }

  /**
   * Re-runs a production deploy for a specific branch (based on the SHAs at the tip of the release branch)
   */
  public async redeployBranchTipToProduction( locales = '*' ): Promise<void> {
    if ( this.isReleased ) {
      await checkoutTarget( this.repo, this.branch, false );

      const version = await getRunnableVersion( this.repo );
      const dependencies = await getDependencies( this.repo );

      await checkoutMain( this.repo, false );

      await buildServerRequest( this.repo, version, this.branch, dependencies, {
        locales: locales,
        brands: this.brands,
        servers: [ 'production' ]
      } );
    }
    else {
      throw new Error( 'Should not redeploy a non-released branch' );
    }
  }

  /**
   * Re-runs a production deploy for a specific branch (based on the SHAs that were most recently production deployed)
   */
  public async redeployLastDeployedSHAsToProduction( locales = '*' ): Promise<void> {
    if ( !this.isReleased ) {
      throw new Error( 'Should not redeploy a non-released branch' );
    }
    if ( this.branch.includes( '-phetio' ) ) {
      throw new Error( 'unsupported suffix -phetio' );
    }

    let url; // string
    let version; // SimVersion
    if ( this.brands.includes( 'phet' ) ) {
      const metadata = await simMetadata( {
        locale: 'en',
        simulation: this.repo
      } );

      const project = metadata.projects.find( project => project.name === `html/${this.repo}` );
      assert( project );
      version = SimVersion.parse( project.version.string );
      url = `https://phet.colorado.edu/sims/html/${this.repo}/${version.toString()}/dependencies.json`;
    }
    else if ( this.brands.includes( 'phet-io' ) ) {
      const metadata = await simPhetioMetadata( {
        active: true
      } );

      const localVersion = await this.getSimVersion();
      const simData = metadata.find( simData => simData.name === this.repo && simData.versionMajor === localVersion.major && simData.versionMinor === localVersion.minor );

      affirm( simData );
      version = new SimVersion( simData.versionMajor, simData.versionMinor, simData.versionMaintenance );
      url = `https://phet-io.colorado.edu/sims/${this.repo}/${version.major}.${version.minor}/dependencies.json`;
    }
    else {
      throw new Error( 'unknown deployed brand' );
    }

    const dependencies = ( await axios.get( url ) ).data;

    if ( dependencies ) {
      await buildServerRequest( this.repo, version, this.branch, dependencies, {
        locales: locales,
        brands: this.brands,
        servers: [ 'production' ]
      } );
    }
    else {
      throw new Error( 'no dependencies' );
    }
  }

  /**
   * Redeploys all last deployed SHAs to production for all maintenance branches.
   */
  public static async redeployAllLastDeployedSHAsToProduction( locales = '*' ): Promise<void> {
    const releaseBranches = await ReleaseBranch.getAllMaintenanceBranches();

    for ( const releaseBranch of releaseBranches ) {
      winston.info( releaseBranch.toString() );

      if ( releaseBranch.isReleased && !releaseBranch.branch.includes( '-phetio' ) ) {
        await releaseBranch.redeployLastDeployedSHAsToProduction( locales );
      }
    }
  }

  /**
   * Combines multiple matching ReleaseBranches into one where appropriate, and sorts. For example, two ReleaseBranches
   * of the same repo but for different brands are combined into a single ReleaseBranch with multiple brands.
   */
  public static combineLists( simBranches: ReleaseBranch[] ): ReleaseBranch[] {
    const resultBranches = [];

    for ( const simBranch of simBranches ) {
      let foundBranch = false;
      for ( const resultBranch of resultBranches ) {
        if ( simBranch.repo === resultBranch.repo && simBranch.branch === resultBranch.branch ) {
          foundBranch = true;
          const resultBrands = [ ...resultBranch.brands ];
          resultBranch.brands.length = 0;
          resultBranch.brands.push( ..._.uniq( [ ...resultBrands, ...simBranch.brands ] ) );
          break;
        }
      }
      if ( !foundBranch ) {
        resultBranches.push( simBranch );
      }
    }

    resultBranches.sort( ( a, b ) => {
      if ( a.repo !== b.repo ) {
        return a.repo < b.repo ? -1 : 1;
      }
      if ( a.branch !== b.branch ) {
        return a.branch < b.branch ? -1 : 1;
      }
      return 0;
    } );

    return resultBranches;
  }
}