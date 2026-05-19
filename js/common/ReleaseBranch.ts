// Copyright 2018-2026, University of Colorado Boulder

/**
 * Represents a simulation release branch for deployment
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import winston from 'winston';
import { Checkout } from './Checkout.js';
import { RunnableBranch } from './RunnableBranch.js';
import { asyncFilter } from './asyncFilter.js';
import { limitedMap } from './limitedMap.js';
import { BuildOptions } from './getBuildArguments.js';
import { LegacyBranch, Repo } from '../browser-and-node/PerennialTypes.js';

export type ReleaseBranchSerialized = {
  repo: Repo;
  branch: LegacyBranch;
};

export type ReleaseBranchSuccessList = {
  succeeded: ReleaseBranch[];
  failed: ReleaseBranch[];
  errorMap: Map<ReleaseBranch, unknown>;
};

export const RELEASE_BRANCH_DEFAULT_CONCURRENT_LIMIT = 5; // TODO: have a setting in buildLocal (!) https://github.com/phetsims/totality/issues/140

export class ReleaseBranch extends RunnableBranch implements ReleaseBranchSerialized {

  // Cache for the timestamp string of the diverging commit, since it can be expensive to calculate and is used in multiple places.
  public cachedTimestampString: string | null = null;

  public constructor(
    // passed to RunnableBranch
    checkout: Checkout,
    repo: Repo,

    public readonly branch: LegacyBranch, // TODO: note: rename to legacyBranch? https://github.com/phetsims/totality/issues/140
    brands: string[],
    public readonly isReleased: boolean
  ) {
    super( checkout, repo, brands );

    assert( Array.isArray( brands ) );
  }

  public static async successListOperation(
    f: ( releaseBranch: ReleaseBranch ) => Promise<void>,
    filter: ( releaseBranch: ReleaseBranch ) => Promise<boolean> = async () => true
  ): Promise<ReleaseBranchSuccessList> {
    const successList: ReleaseBranchSuccessList = {
      succeeded: [],
      failed: [],
      errorMap: new Map()
    };

    const filteredReleaseBranches = await asyncFilter( await Checkout.getMaintainedReleaseBranches(), filter );

    await limitedMap( filteredReleaseBranches, async releaseBranch => {
      try {
        await f( releaseBranch );
        successList.succeeded.push( releaseBranch );
      }
      catch( e ) {
        winston.error( `Failed to update ${releaseBranch.toString()}: ${e instanceof Error ? e.stack : e}` );
        successList.failed.push( releaseBranch );
        successList.errorMap.set( releaseBranch, e );
      }
    }, RELEASE_BRANCH_DEFAULT_CONCURRENT_LIMIT );

    return successList;
  }

  // TODO: a catch-all function that will update/transpile/build all release branches? (filter of course) https://github.com/phetsims/totality/issues/140
  // TODO: consider some functions like this over in Maintenance (or keep here, and allow passing in a release branch list?) https://github.com/phetsims/totality/issues/140

  public static async updateReleaseBranches(
    filter: ( releaseBranch: ReleaseBranch ) => Promise<boolean> = async () => true
  ): Promise<ReleaseBranchSuccessList> {
    return ReleaseBranch.successListOperation( async releaseBranch => {
      await releaseBranch.checkout.updateWorktree();
    }, filter );
  }

  public static async transpileReleaseBranches(
    filter: ( releaseBranch: ReleaseBranch ) => Promise<boolean> = async () => true
  ): Promise<ReleaseBranchSuccessList> {
    return ReleaseBranch.successListOperation( async releaseBranch => {
      await releaseBranch.transpile();
    }, filter );
  }

  public static async buildReleaseBranches(
    buildOptions?: Partial<BuildOptions>,
    filter: ( releaseBranch: ReleaseBranch ) => Promise<boolean> = async () => true
  ): Promise<ReleaseBranchSuccessList> {
    return ReleaseBranch.successListOperation( async releaseBranch => {
      await releaseBranch.build( buildOptions );
    }, filter );
  }

  public static async checkUnbuiltReleaseBranches(
    filter: ( releaseBranch: ReleaseBranch ) => Promise<boolean> = async () => true
  ): Promise<ReleaseBranchSuccessList> {
    return ReleaseBranch.successListOperation( async releaseBranch => {
      const result = await releaseBranch.checkUnbuilt();

      if ( result !== null ) {
        throw new Error( result );
      }
    }, filter );
  }

  public static async checkBuiltReleaseBranches(
    filter: ( releaseBranch: ReleaseBranch ) => Promise<boolean> = async () => true
  ): Promise<ReleaseBranchSuccessList> {
    return ReleaseBranch.successListOperation( async releaseBranch => {
      const result = await releaseBranch.checkBuilt();

      if ( result !== null ) {
        throw new Error( result );
      }
    }, filter );
  }

  /**
   * Convert into a plain JS object meant for JSON serialization.
   *
   * NOTE: use Checkout.getReleaseBranch to deserialize
   */
  public serialize(): ReleaseBranchSerialized {
    return {
      repo: this.repo,
      branch: this.branch
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
   * Re-runs a production deploy for a specific branch (based on the SHAs at the tip of the release branch)
   */
  public async redeployBranchTipToProduction( locales = '*' ): Promise<void> {
    if ( this.isReleased ) {
      // TODO: needs recoding https://github.com/phetsims/totality/issues/140
      throw new Error( 'unimplemented' );
      // await checkoutTarget( this.repo, this.branch, false );
      //
      // const version = await getRunnableVersion( this.repo );
      // const dependencies = await getDependencies( this.repo );
      //
      // await checkoutMain( this.repo, false );
      //
      // await buildServerRequest( this.repo, version, this.branch, dependencies, {
      //   locales: locales,
      //   brands: this.brands,
      //   servers: [ 'production' ]
      // } );
    }
    else {
      throw new Error( 'Should not redeploy a non-released branch' );
    }
  }

  /**
   * Re-runs a production deploy for a specific branch (based on the SHAs that were most recently production deployed)
   */
  public async redeployLastDeployedSHAsToProduction( locales = '*' ): Promise<void> {
    // TODO: needs recoding https://github.com/phetsims/totality/issues/140
    throw new Error( 'unimplemented' );
    // if ( !this.isReleased ) {
    //   throw new Error( 'Should not redeploy a non-released branch' );
    // }
    // if ( this.branch.includes( '-phetio' ) ) {
    //   throw new Error( 'unsupported suffix -phetio' );
    // }
    //
    // let url; // string
    // let version; // SimVersion
    // if ( this.brands.includes( 'phet' ) ) {
    //   const metadata = await simMetadata( {
    //     locale: 'en',
    //     simulation: this.repo
    //   } );
    //
    //   const project = metadata.projects.find( project => project.name === `html/${this.repo}` );
    //   assert( project );
    //   version = SimVersion.parse( project.version.string );
    //   url = `https://phet.colorado.edu/sims/html/${this.repo}/${version.toString()}/dependencies.json`;
    // }
    // else if ( this.brands.includes( 'phet-io' ) ) {
    //   const metadata = await simPhetioMetadata( {
    //     active: true
    //   } );
    //
    //   const localVersion = await this.getSimVersion();
    //   const simData = metadata.find( simData => simData.name === this.repo && simData.versionMajor === localVersion.major && simData.versionMinor === localVersion.minor );
    //
    //   affirm( simData );
    //   version = new SimVersion( simData.versionMajor, simData.versionMinor, simData.versionMaintenance );
    //   url = `https://phet-io.colorado.edu/sims/${this.repo}/${version.major}.${version.minor}/dependencies.json`;
    // }
    // else {
    //   throw new Error( 'unknown deployed brand' );
    // }
    //
    // const dependencies = ( await axios.get( url ) ).data;
    //
    // if ( dependencies ) {
    //   await buildServerRequest( this.repo, version, this.branch, dependencies, {
    //     locales: locales,
    //     brands: this.brands,
    //     servers: [ 'production' ]
    //   } );
    // }
    // else {
    //   throw new Error( 'no dependencies' );
    // }
  }

  /**
   * Redeploys all last deployed SHAs to production for all maintenance branches.
   */
  public static async redeployAllLastDeployedSHAsToProduction( locales = '*' ): Promise<void> {
    const releaseBranches = await Checkout.getMaintainedReleaseBranches();

    for ( const releaseBranch of releaseBranches ) {
      winston.info( releaseBranch.toString() );

      if ( releaseBranch.isReleased && !releaseBranch.branch.includes( '-phetio' ) ) {
        await releaseBranch.redeployLastDeployedSHAsToProduction( locales );
      }
    }
  }
}