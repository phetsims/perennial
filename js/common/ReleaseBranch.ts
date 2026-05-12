// Copyright 2018-2026, University of Colorado Boulder

/**
 * Represents a simulation release branch for deployment
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import winston from 'winston';
import { getBranchSHAMap } from './getBranchSHAMap.js';
import { Checkout } from './Checkout.js';
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
      // TODO: needs recoding
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
    // TODO: needs recoding
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