// Copyright 2018, University of Colorado Boulder

/**
 * Represents a modified simulation release branch, with either pending or applied (and not published) changes.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import SimVersion from '../browser-and-node/SimVersion.js';
import checkoutDependencies from './checkoutDependencies.js';
import getDependencies from './getDependencies.js';
import gitCheckout from './gitCheckout.js';
import githubCreateIssue from './githubCreateIssue.js';
import gitPull from './gitPull.js';
import Patch from './Patch.js';
import ReleaseBranch from './ReleaseBranch.js';

// Keys are repo names, values are SHAs
type Dependencies = Record<string, string>;

type ModifiedBranchSerialized = {
  releaseBranch: ReturnType<ReleaseBranch['serialize']>;
  changedDependencies: Dependencies;
  neededPatches: string[];
  pendingMessages: string[];
  pushedMessages: string[];
  deployedVersion: ReturnType<SimVersion['serialize']> | null;
};

class ModifiedBranch {
  public readonly repo: string;
  public readonly branch: string;
  public readonly brands: string[];

  /**
   * @param releaseBranch
   * @param changedDependencies -
   * @param neededPatches
   * @param pendingMessages - Messages from already-applied patches or other changes NOT included in dependencies.json yet
   * @param pushedMessages - Messages from already-applied patches or other changes that have been included in dependencies.json
   * @param deployedVersion - The deployed version for the latest patches applied. Will be reset to null when updates are made.
   */
  public constructor(
    public readonly releaseBranch: ReleaseBranch,
    public readonly changedDependencies: Dependencies = {},
    public readonly neededPatches: Patch[] = [],
    public readonly pendingMessages: string[] = [],
    public readonly pushedMessages: string[] = [],
    public deployedVersion: SimVersion | null = null ) {

    this.repo = releaseBranch.repo;
    this.branch = releaseBranch.branch;
    this.brands = releaseBranch.brands;
  }

  /**
   * Convert into a plain JS object meant for JSON serialization.
   */
  public serialize(): ModifiedBranchSerialized {
    return {
      releaseBranch: this.releaseBranch.serialize(),
      changedDependencies: this.changedDependencies,
      neededPatches: this.neededPatches.map( patch => patch.name ),
      pendingMessages: this.pendingMessages,
      pushedMessages: this.pushedMessages,
      deployedVersion: this.deployedVersion ? this.deployedVersion.serialize() : null
    };
  }

  /**
   * Takes a serialized form of the ModifiedBranch and returns an actual instance.
   * For "patches" param, we only want to store patches in one location, so don't fully save the info.
   *
   */
  public static deserialize( { releaseBranch, changedDependencies, neededPatches = [], pendingMessages, pushedMessages, deployedVersion }: ModifiedBranchSerialized, patches: Patch[] ): ModifiedBranch {
    return new ModifiedBranch(
      ReleaseBranch.deserialize( releaseBranch ),
      changedDependencies,
      neededPatches.map( name => patches.find( patch => patch.name === name )! ),
      pendingMessages,
      pushedMessages,
      deployedVersion ? SimVersion.deserialize( deployedVersion ) : null
    );
  }

  /**
   * Whether there is no need to keep a reference to us.
   */
  public get isUnused(): boolean {
    return this.neededPatches.length === 0 &&
           Object.keys( this.changedDependencies ).length === 0 &&
           this.pushedMessages.length === 0 &&
           this.pendingMessages.length === 0;
  }

  /**
   * Whether it is safe to deploy a release candidate for this branch.
   */
  public get isReadyForReleaseCandidate(): boolean {
    return this.neededPatches.length === 0 &&
           this.pushedMessages.length > 0 &&
           this.deployedVersion === null;
  }

  /**
   * Whether it is safe to deploy a production version for this branch.
   */
  public get isReadyForProduction(): boolean {
    return this.neededPatches.length === 0 &&
           this.pushedMessages.length > 0 &&
           this.deployedVersion !== null &&
           this.deployedVersion.testType === 'rc';
  }

  /**
   * Returns the branch name that should be used in dependency repositories.
   */
  public get dependencyBranch(): string {
    return `${this.repo}-${this.branch}`;
  }

  /**
   * Creates an issue to note that un-tested changes were patched into a branch, and should at some point be tested.
   */
  public async createUnreleasedIssue( additionalNotes = '' ): Promise<void> {
    await githubCreateIssue( this.repo, `Maintenance patches applied to branch ${this.branch}`, {
      labels: [ 'status:ready-for-qa' ],
      body: `This branch (${this.branch}) had changes related to the following applied:

${this.pushedMessages.map( message => `- ${message}` ).join( '\n' )}

Presumably one or more of these changes is likely to have been applied after the last RC version, and should be spot-checked by QA in the next RC (or if it was ready for a production release, an additional spot-check RC should be created).
${additionalNotes ? `\n${additionalNotes}` : ''}`
    } );
  }

  /**
   * Returns a list of deployed links for testing (depending on the brands deployed).
   */
  public async getDeployedLinkLines( includeMessages = true ): Promise<string[]> {
    assert( this.deployedVersion !== null );

    const linkSuffixes = [];
    const versionString = this.deployedVersion.toString();

    const standaloneParams = await this.releaseBranch.getPhetioStandaloneQueryParameter();
    const proxiesParams = ( await this.releaseBranch.usesRelativeSimPath() ) ? 'relativeSimPath' : 'launchLocalVersion';
    const studioName = ( this.brands.includes( 'phet-io' ) && await this.releaseBranch.usesPhetioStudio() ) ? 'studio' : 'instance-proxies';
    const studioNameBeautified = studioName === 'studio' ? 'Studio' : 'Instance Proxies';
    const usesChipper2 = await this.releaseBranch.usesChipper2();
    const phetFolder = usesChipper2 ? '/phet' : '';
    const phetioFolder = usesChipper2 ? '/phet-io' : '';
    const phetSuffix = usesChipper2 ? '_phet' : '';
    const phetioSuffix = usesChipper2 ? '_all_phet-io' : '_en-phetio';
    const phetioBrandSuffix = usesChipper2 ? '' : '-phetio';
    const studioPathSuffix = ( await this.releaseBranch.usesPhetioStudioIndex() ) ? '' : `/${studioName}.html?sim=${this.repo}&${proxiesParams}`;
    const phetioDevVersion = usesChipper2 ? versionString : versionString.split( '-' ).join( '-phetio' );

    if ( this.deployedVersion.testType === 'rc' ) {
      if ( this.brands.includes( 'phet' ) ) {
        linkSuffixes.push( `](https://phet-dev.colorado.edu/html/${this.repo}/${versionString}${phetFolder}/${this.repo}_all${phetSuffix}.html)` );
      }
      if ( this.brands.includes( 'phet-io' ) ) {
        linkSuffixes.push( ` phet-io](https://phet-dev.colorado.edu/html/${this.repo}/${phetioDevVersion}${phetioFolder}/${this.repo}${phetioSuffix}.html?${standaloneParams})` );
        linkSuffixes.push( ` phet-io ${studioNameBeautified}](https://phet-dev.colorado.edu/html/${this.repo}/${phetioDevVersion}${phetioFolder}/wrappers/${studioName}${studioPathSuffix})` );
      }
    }
    else {
      if ( this.brands.includes( 'phet' ) ) {
        linkSuffixes.push( `](https://phet.colorado.edu/sims/html/${this.repo}/${versionString}/${this.repo}_all.html)` );
      }
      if ( this.brands.includes( 'phet-io' ) ) {
        linkSuffixes.push( ` phet-io](https://phet-io.colorado.edu/sims/${this.repo}/${versionString}${phetioBrandSuffix}/${this.repo}${phetioSuffix}.html?${standaloneParams})` );
        linkSuffixes.push( ` phet-io ${studioNameBeautified}](https://phet-io.colorado.edu/sims/${this.repo}/${versionString}${phetioBrandSuffix}/wrappers/${studioName}${studioPathSuffix})` );
      }
    }

    const results = linkSuffixes.map( link => `- [ ] [${this.repo} ${versionString}${link}` );
    if ( includeMessages ) {
      results.unshift( `\n**${this.repo} ${this.branch}** (${this.pushedMessages.join( ', ' )})\n` );
    }
    return results;
  }

  /**
   * Checks out the modified branch.
   *
   * @returns - Names of checked out repositories
   */
  public async checkout( includeNpmUpdate = true ): Promise<string[]> {
    await gitCheckout( this.repo, this.branch );
    await gitPull( this.repo );
    const dependencies = await getDependencies( this.repo );
    for ( const key of Object.keys( this.changedDependencies ) ) {
      // This should exist hopefully
      dependencies[ key ].sha = this.changedDependencies[ key ];
    }
    return checkoutDependencies( this.repo, dependencies, includeNpmUpdate );
  }
}

export default ModifiedBranch;