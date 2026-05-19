// Copyright 2018-2026, University of Colorado Boulder

/**
 * Represents a modified simulation release branch, with either pending or applied (and not published) changes.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import _ from 'lodash';
import SimVersion from '../../browser-and-node/SimVersion.js';
import { ReleaseBranch } from '../ReleaseBranch.js';
import { Patch } from './Patch.js';
import { githubCreateIssue } from '../githubCreateIssue.js';
import { LegacyBranch, Repo, SHA } from '../../browser-and-node/PerennialTypes.js';

type ModifiedBranchSerialized = {
  releaseBranch: ReturnType<ReleaseBranch['serialize']>;
  neededPatches: string[];
  pushedMessages: string[];
  deployedVersion: ReturnType<SimVersion['serialize']> | null;

  lastUpdate?: LastRun;
  lastTranspile?: LastRun;
  lastBuild?: LastRun;
  lastUnbuiltCheck?: LastRun;
  lastBuiltCheck?: LastRun;
};

export type UpdateTestingOptions = {
  update?: boolean;
  transpile?: boolean;
  build?: boolean;
  unbuiltCheck?: boolean;
  builtCheck?: boolean;
};

export type LastRun = null | ( {
  sha: SHA;
} & (
  {
    success: true;
  } | {
    success: false;
    error: string;
  }
) );

export type DeployedLinkOptions = {

  // Whether to include the header line with pushed messages and supported features.
  includeMessages?: boolean;

  // Whether to include XHTML links when the sim supports them.
  xhtml?: boolean;

  // Whether to include a11y view links when the sim supports them.
  a11yView?: boolean;

  // Whether to include migration wrapper links when the sim supports them.
  migration?: boolean;
};

export class ModifiedBranch {
  public readonly repo: Repo;
  public readonly branch: LegacyBranch;
  public readonly brands: string[];

  /**
   * @param releaseBranch
   * @param neededPatches
   * @param pushedMessages - Messages from already-applied patches or other changes that have been included in dependencies.json
   * @param deployedVersion - The deployed version for the latest patches applied. Will be reset to null when updates are made.
   */
  public constructor(
    public readonly releaseBranch: ReleaseBranch,
    public readonly neededPatches: Patch[] = [],
    public readonly pushedMessages: string[] = [],
    public deployedVersion: SimVersion | null = null,

    public lastUpdate: LastRun = null,
    public lastTranspile: LastRun = null,
    public lastBuild: LastRun = null,
    public lastUnbuiltCheck: LastRun = null,
    public lastBuiltCheck: LastRun = null
  ) {
    this.repo = releaseBranch.repo;
    this.branch = releaseBranch.branch;
    this.brands = releaseBranch.brands;
  }

  public async updateTesting( options?: UpdateTestingOptions ): Promise<void> {
    const runUpdate = options?.update ?? true;
    const runTranspile = options?.transpile ?? true;
    const runBuild = options?.build ?? true;
    const runUnbuiltCheck = options?.unbuiltCheck ?? runTranspile;
    const runBuiltCheck = options?.builtCheck ?? runBuild;

    const currentSHA = await this.releaseBranch.checkout.getSHA();

    const isSuccess = ( runResult: LastRun ): boolean => {
      return !!runResult && runResult.sha === currentSHA && runResult.success;
    };

    const run = async ( oldLastRun: LastRun, shouldRun: boolean, runFunction: () => Promise<void> ): Promise<LastRun> => {
      const isUpToDate = !!oldLastRun && oldLastRun.sha === currentSHA;

      if ( isUpToDate ) {
        return oldLastRun;
      }

      if ( shouldRun ) {
        try {
          await runFunction();

          return {
            sha: currentSHA,
            success: true
          };
        }
        catch( e ) {
          return {
            sha: currentSHA,
            success: false,
            error: e instanceof Error ? ( e + '\n' + e.stack ) : String( e )
          };
        }
      }
      else {
        return null;
      }
    };

    // Conditions where testing should be reset (if any of these are true, we want to reset all testing results):
    const isClean = await this.releaseBranch.checkout.isClean();
    if ( !isClean || this.neededPatches.length > 0 ) {
      this.lastUpdate = null;
      this.lastTranspile = null;
      this.lastBuild = null;
      this.lastUnbuiltCheck = null;
      this.lastBuiltCheck = null;
      return;
    }

    this.lastUpdate = await run( this.lastUpdate, runUpdate, async () => {
      await this.releaseBranch.checkout.updateWorktree();
    } );

    this.lastTranspile = await run( this.lastTranspile, runTranspile && isSuccess( this.lastUpdate ), async () => {
      await this.releaseBranch.transpile();
    } );

    this.lastBuild = await run( this.lastBuild, runBuild && isSuccess( this.lastUpdate ), async () => {
      await this.releaseBranch.build();
    } );

    this.lastUnbuiltCheck = await run( this.lastUnbuiltCheck, runUnbuiltCheck && isSuccess( this.lastTranspile ), async () => {
      await this.releaseBranch.checkUnbuilt();
    } );

    this.lastBuiltCheck = await run( this.lastBuiltCheck, runBuiltCheck && isSuccess( this.lastBuild ), async () => {
      await this.releaseBranch.checkBuilt();
    } );
  }

  /**
   * Convert into a plain JS object meant for JSON serialization.
   */
  public serialize(): ModifiedBranchSerialized {
    return {
      releaseBranch: this.releaseBranch.serialize(),
      neededPatches: this.neededPatches.map( patch => patch.name ),
      pushedMessages: this.pushedMessages,
      deployedVersion: this.deployedVersion ? this.deployedVersion.serialize() : null,
      lastUpdate: this.lastUpdate,
      lastTranspile: this.lastTranspile,
      lastBuild: this.lastBuild,
      lastUnbuiltCheck: this.lastUnbuiltCheck,
      lastBuiltCheck: this.lastBuiltCheck
    };
  }

  /**
   * Takes a serialized form of the ModifiedBranch and returns an actual instance.
   * For "patches" param, we only want to store patches in one location, so don't fully save the info.
   *
   */
  public static async deserialize(
    {
      releaseBranch: releaseBranchSerialized,
      neededPatches = [],
      pushedMessages,
      deployedVersion,
      lastUpdate = null,
      lastTranspile = null,
      lastBuild = null,
      lastUnbuiltCheck = null,
      lastBuiltCheck = null
    }: ModifiedBranchSerialized,
    patches: Patch[],
    releaseBranches: ReleaseBranch[]
  ): Promise<ModifiedBranch> {
    const releaseBranch = releaseBranches.find( branch => branch.repo === releaseBranchSerialized.repo && branch.branch === releaseBranchSerialized.branch );
    if ( !releaseBranch ) {
      throw new Error( `Could not find release branch for ${releaseBranchSerialized.repo} ${releaseBranchSerialized.branch}` );
    }

    return new ModifiedBranch(
      releaseBranch,
      neededPatches.map( name => patches.find( patch => patch.name === name )! ),
      pushedMessages,
      deployedVersion ? SimVersion.deserialize( deployedVersion ) : null,
      lastUpdate,
      lastTranspile,
      lastBuild,
      lastUnbuiltCheck,
      lastBuiltCheck
    );
  }

  /**
   * Only use this for advanced internal reasons if you are fixing many duplicated ModifiedBranch objects.
   *
   * Clears out deployed versions.
   */
  public combine( other: ModifiedBranch ): ModifiedBranch {
    if ( !this.releaseBranch.equals( other.releaseBranch ) ) {
      throw new Error( 'Cannot combine ModifiedBranches' );
    }

    return new ModifiedBranch(
      this.releaseBranch,
      _.uniq( [
        ...this.neededPatches,
        ...other.neededPatches
      ] ),
      _.uniq( [
        ...this.pushedMessages,
        ...other.pushedMessages
      ] ),
      null
    );
  }

  /**
   * Whether there is no need to keep a reference to us.
   */
  public get isUnused(): boolean {
    return this.neededPatches.length === 0 &&
           this.pushedMessages.length === 0;
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
  public get dependencyBranch(): LegacyBranch {
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
   * Returns a string that prints out the supported features for the release branch
   */
  public async getSupportedFeaturesLine(): Promise<string> {
    const packageJSON = await this.releaseBranch.getPackageJSON();

    const simFeatures = packageJSON?.phet?.simFeatures ?? {};

    const nonDefaultColorProfiles = simFeatures.colorProfiles?.filter( ( profile: string ) => profile !== 'default' ) ?? [];
    const colorProfilesString = nonDefaultColorProfiles.length ? ` colorProfiles: ${nonDefaultColorProfiles.join( ',' )}` : '';

    const supportedRegionsAndCultures = simFeatures.supportedRegionsAndCultures ?? [];
    const regionsAndCulturesString = supportedRegionsAndCultures.length ? ` supportedRegionsAndCultures: ${supportedRegionsAndCultures.join( ',' )}` : '';

    const features = Object.keys( simFeatures ).filter( feature => feature !== 'colorProfiles' && feature !== 'supportedRegionsAndCultures' );

    const mainString = features.join( ', ' ) + colorProfilesString + regionsAndCulturesString;

    return mainString.length ? `- ${mainString}` : '';
  }

  /**
   * Returns a list of deployed links for testing (depending on the brands deployed).
   */
  public async getDeployedLinkLines( providedOptions?: DeployedLinkOptions ): Promise<string[]> {
    assert( this.deployedVersion !== null );

    const options = _.merge( {
      includeMessages: true,
      xhtml: false,
      a11yView: false,
      migration: false
    }, providedOptions );

    const linkSuffixes = [];
    const versionString = this.deployedVersion.toString();

    // TODO: move some of this logic into RunnableBranch (!) https://github.com/phetsims/totality/issues/140

    const standaloneParams = await this.releaseBranch.checkout.getPhetioStandaloneQueryParameter();
    const proxiesParams = ( await this.releaseBranch.checkout.usesRelativeSimPath() ) ? 'relativeSimPath' : 'launchLocalVersion';
    const studioName = ( this.brands.includes( 'phet-io' ) && await this.releaseBranch.checkout.usesPhetioStudio() ) ? 'studio' : 'instance-proxies';
    const studioNameBeautified = studioName === 'studio' ? 'Studio' : 'Instance Proxies';
    const usesChipper2 = await this.releaseBranch.checkout.usesChipper2();
    const hasXHTML = await this.releaseBranch.checkout.hasXHTML();
    const phetFolder = usesChipper2 ? '/phet' : '';
    const phetioFolder = usesChipper2 ? '/phet-io' : '';
    const phetSuffix = usesChipper2 ? '_phet' : '';
    const phetioSuffix = usesChipper2 ? '_all_phet-io' : '_en-phetio';
    const phetioBrandSuffix = usesChipper2 ? '' : '-phetio';
    const studioPathSuffix = ( await this.releaseBranch.checkout.usesPhetioStudioIndex() ) ? '' : `/${studioName}.html?sim=${this.repo}&${proxiesParams}`;
    const phetioDevVersion = usesChipper2 ? versionString : versionString.split( '-' ).join( '-phetio' );
    const hasMigrationWrapper = await this.releaseBranch.checkout.hasMigrationWrapper();
    const supportsInteractiveDescription = options.a11yView ? await this.releaseBranch.supportsInteractiveDescription() : false;

    if ( this.deployedVersion.testType === 'rc' ) {
      if ( this.brands.includes( 'phet' ) ) {
        linkSuffixes.push( `](https://phet-dev.colorado.edu/html/${this.repo}/${versionString}${phetFolder}/${this.repo}_all${phetSuffix}.html)` );
        if ( options.a11yView && supportsInteractiveDescription ) {
          linkSuffixes.push( ` a11y view](https://phet-dev.colorado.edu/html/${this.repo}/${versionString}${phetFolder}/${this.repo}_a11y_view.html)` );
        }
        if ( options.xhtml && hasXHTML ) {
          linkSuffixes.push( ` xhtml](https://phet-dev.colorado.edu/html/${this.repo}/${versionString}${phetFolder}/xhtml/${this.repo}_all.xhtml)` );
        }
      }
      if ( this.brands.includes( 'phet-io' ) ) {
        linkSuffixes.push( ` phet-io](https://phet-dev.colorado.edu/html/${this.repo}/${phetioDevVersion}${phetioFolder}/${this.repo}${phetioSuffix}.html?${standaloneParams})` );
        linkSuffixes.push( ` phet-io ${studioNameBeautified}](https://phet-dev.colorado.edu/html/${this.repo}/${phetioDevVersion}${phetioFolder}/wrappers/${studioName}${studioPathSuffix})` );
        if ( options.migration && hasMigrationWrapper ) {
          linkSuffixes.push( ` phet-io migration](https://phet-dev.colorado.edu/html/${this.repo}/${phetioDevVersion}${phetioFolder}/wrappers/migration/)` );
        }
      }
    }
    else {
      if ( this.brands.includes( 'phet' ) ) {
        linkSuffixes.push( `](https://phet.colorado.edu/sims/html/${this.repo}/${versionString}/${this.repo}_all.html)` );
        if ( options.a11yView && supportsInteractiveDescription ) {
          linkSuffixes.push( ` a11y view](https://phet.colorado.edu/sims/html/${this.repo}/${versionString}/${this.repo}_a11y_view.html)` );
        }
        if ( options.xhtml && hasXHTML ) {
          linkSuffixes.push( ` xhtml](https://phet.colorado.edu/sims/html/${this.repo}/${versionString}/xhtml/${this.repo}_all.xhtml)` );
        }
      }
      if ( this.brands.includes( 'phet-io' ) ) {
        linkSuffixes.push( ` phet-io](https://phet-io.colorado.edu/sims/${this.repo}/${versionString}${phetioBrandSuffix}/${this.repo}${phetioSuffix}.html?${standaloneParams})` );
        linkSuffixes.push( ` phet-io ${studioNameBeautified}](https://phet-io.colorado.edu/sims/${this.repo}/${versionString}${phetioBrandSuffix}/wrappers/${studioName}${studioPathSuffix})` );
      }
    }

    const results = linkSuffixes.map( link => `- [ ] [${this.repo} ${versionString}${link}` );
    if ( options.includeMessages ) {
      const featuresLine = await this.getSupportedFeaturesLine();
      if ( featuresLine.length ) {
        results.unshift( featuresLine );
      }
      results.unshift( `\n**${this.repo} ${this.branch}** ${await this.releaseBranch.checkout.getDivergingTimestampString()} (${this.pushedMessages.join( ', ' )})\n` );
    }
    return results;
  }
}