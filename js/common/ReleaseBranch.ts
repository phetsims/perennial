// Copyright 2018-2024, University of Colorado Boulder

/**
 * Represents a simulation release branch for deployment
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
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
import buildLocal from './buildLocal.js';
import buildServerRequest from './buildServerRequest.js';
import checkoutMain from './checkoutMain.js';
import checkoutTarget from './checkoutTarget.js';
import chipperSupportsOutputJSGruntTasks from './chipperSupportsOutputJSGruntTasks.js';
import ChipperVersion from './ChipperVersion.js';
import createDirectory from './createDirectory.js';
import execute from './execute.js';
import getActiveSims from './getActiveSims.js';
import getBranchDependencies from './getBranchDependencies.js';
import getBranches from './getBranches.js';
import getBranchMap from './getBranchMap.js';
import getBranchVersion from './getBranchVersion.js';
import getBuildArguments from './getBuildArguments.js';
import getDependencies from './getDependencies.js';
import getFileAtBranch from './getFileAtBranch.js';
import getGitFile from './getGitFile.js';
import getRepoVersion from './getRepoVersion.js';
import gitCatFile from './gitCatFile.js';
import gitCheckout from './gitCheckout.js';
import gitCheckoutDirectory from './gitCheckoutDirectory.js';
import gitCloneOrFetchDirectory from './gitCloneOrFetchDirectory.js';
import gitFirstDivergingCommit from './gitFirstDivergingCommit.js';
import gitIsAncestor from './gitIsAncestor.js';
import gitPull from './gitPull.js';
import gitPullDirectory from './gitPullDirectory.js';
import gitRevParse from './gitRevParse.js';
import gitTimestamp from './gitTimestamp.js';
import gruntCommand from './gruntCommand.js';
import loadJSON from './loadJSON.js';
import npmUpdateDirectory from './npmUpdateDirectory.js';
import puppeteerLoad from './puppeteerLoad.js';
import simMetadata from './simMetadata.js';
import simPhetioMetadata from './simPhetioMetadata.js';
import withServer from './withServer.js';


const MAINTENANCE_DIRECTORY = '../release-branches';

type ReleaseBranchSerialized = {
  repo: string;
  branch: string;
  brands: string[];
  isReleased: boolean;
};

class ReleaseBranch implements ReleaseBranchSerialized {
  public constructor( public readonly repo: string, public readonly branch: string, public readonly brands: string[],
                      public readonly isReleased: boolean ) {
    assert( Array.isArray( brands ) );
  }

  /**
   * Convert into a plain JS object meant for JSON serialization.
   */
  public serialize(): ReleaseBranchSerialized {
    return {
      repo: this.repo,
      branch: this.branch,
      brands: this.brands,
      isReleased: this.isReleased
    };
  }

  /**
   * Takes a serialized form of the ReleaseBranch and returns an actual instance.
   */
  public static deserialize( { repo, branch, brands, isReleased }: ReleaseBranchSerialized ): ReleaseBranch {
    return new ReleaseBranch( repo, branch, brands, isReleased );
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
  public toString(): string {
    return `${this.repo} ${this.branch} ${this.brands.join( ',' )}${this.isReleased ? '' : ' (unpublished)'}`;
  }

  /**
   *
   * @param repo {string}
   * @param branch {string}
   */
  public static getCheckoutDirectory( repo: string, branch: string ): string {
    return `${MAINTENANCE_DIRECTORY}/${repo}-${branch}`;
  }

  /**
   * Returns the maintenance directory, for things that want to use it directly.
   *
   */
  public static getMaintenanceDirectory(): string {
    return MAINTENANCE_DIRECTORY;
  }

  /**
   * Returns the path (relative to the repo) to the built phet-brand HTML file
   */
  public async getLocalPhetBuiltHTMLPath(): Promise<string> {
    const usesChipper2 = await this.usesChipper2();

    return `build/${usesChipper2 ? 'phet/' : ''}${this.repo}_en${usesChipper2 ? '_phet' : ''}.html`;
  }

  /**
   * Returns the path (relative to the repo) to the built phet-io-brand HTML file
   *
   */
  public async getLocalPhetIOBuiltHTMLPath(): Promise<string> {
    const usesChipper2 = await this.usesChipper2();

    return `build/${usesChipper2 ? 'phet-io/' : ''}${this.repo}${usesChipper2 ? '_all_phet-io' : '_en-phetio'}.html`;
  }

  /**
   * Returns the query parameter to use for activating phet-io standalone mode
   *
   */
  public async getPhetioStandaloneQueryParameter(): Promise<string> {
    return ( await this.usesOldPhetioStandalone() ) ? 'phet-io.standalone' : 'phetioStandalone';
  }

  public getChipperVersion(): ChipperVersion {
    const checkoutDirectory = ReleaseBranch.getCheckoutDirectory( this.repo, this.branch );

    return ChipperVersion.getFromPackageJSON(
      JSON.parse( fs.readFileSync( `${checkoutDirectory}/chipper/package.json`, 'utf8' ) )
    );
  }

  public async updateCheckout( overrideDependencies: Dependencies = {} ): Promise<void> {
    winston.info( `updating checkout for ${this.toString()}` );

    if ( !fs.existsSync( MAINTENANCE_DIRECTORY ) ) {
      winston.info( `creating directory ${MAINTENANCE_DIRECTORY}` );
      await createDirectory( MAINTENANCE_DIRECTORY );
    }
    const checkoutDirectory = ReleaseBranch.getCheckoutDirectory( this.repo, this.branch );
    if ( !fs.existsSync( checkoutDirectory ) ) {
      winston.info( `creating directory ${checkoutDirectory}` );
      await createDirectory( checkoutDirectory );
    }

    await gitCloneOrFetchDirectory( this.repo, checkoutDirectory );
    await gitCheckoutDirectory( this.branch, `${checkoutDirectory}/${this.repo}` );
    await gitPullDirectory( `${checkoutDirectory}/${this.repo}` );
    const dependenciesOnBranchTip = await loadJSON( `${checkoutDirectory}/${this.repo}/dependencies.json` );

    dependenciesOnBranchTip.babel = { sha: buildLocal.babelBranch, branch: buildLocal.babelBranch };

    const dependencyRepos = _.uniq( [
      ...Object.keys( dependenciesOnBranchTip ),
      ...Object.keys( overrideDependencies )
    ].filter( repo => repo !== 'comment' ) );

    await Promise.all( dependencyRepos.map( async repo => {
      const repoPwd = `${checkoutDirectory}/${repo}`;

      await gitCloneOrFetchDirectory( repo, checkoutDirectory );

      const sha = overrideDependencies[ repo ] ? overrideDependencies[ repo ].sha : dependenciesOnBranchTip[ repo ].sha;
      await gitCheckoutDirectory( sha, repoPwd );

      // Pull babel, since we don't give it a specific SHA (just a branch),
      // see https://github.com/phetsims/perennial/issues/326
      if ( repo === 'babel' ) {
        await gitPullDirectory( repoPwd );
      }

      if ( repo === 'chipper' || repo === 'perennial-alias' || repo === this.repo ) {
        winston.info( `npm ${repo} in ${checkoutDirectory}` );

        await npmUpdateDirectory( repoPwd );
      }
    } ) );

    // Perennial can be a nice manual addition in each dir, in case you need to go in and run commands to these
    // branches manually (like build or checkout or update). No need to npm install, you can do that yourself if needed.
    await gitCloneOrFetchDirectory( 'perennial', checkoutDirectory );
    await gitPullDirectory( `${checkoutDirectory}/perennial` );
  }

  // TODO: Better type once getBuildArguments is in TypeScript, https://github.com/phetsims/perennial/issues/369
  public async build( options?: object ): Promise<void> {
    const checkoutDirectory = ReleaseBranch.getCheckoutDirectory( this.repo, this.branch );
    const repoDirectory = `${checkoutDirectory}/${this.repo}`;

    const args = getBuildArguments( this.getChipperVersion(), _.merge( {
      brands: this.brands,
      allHTML: true,
      debugHTML: true,
      lint: false,
      locales: '*'
    }, options ) );

    winston.info( `building ${checkoutDirectory} with grunt ${args.join( ' ' )}` );
    await execute( gruntCommand, args, repoDirectory );
  }

  public async transpile(): Promise<void> {
    const checkoutDirectory = ReleaseBranch.getCheckoutDirectory( this.repo, this.branch );
    const repoDirectory = `${checkoutDirectory}/${this.repo}`;

    if ( chipperSupportsOutputJSGruntTasks() ) {
      winston.info( `transpiling ${checkoutDirectory}` );

      // We might not be able to run this command!
      await execute( gruntCommand, [ 'output-js-project', '--silent' ], repoDirectory, {
        errors: 'resolve'
      } );
    }
  }

  public async checkUnbuilt(): Promise<string | null> {
    try {
      return await withServer( async port => {
        const url = `http://localhost:${port}/${this.repo}/${this.repo}_en.html?brand=phet&ea&fuzzMouse&fuzzTouch`;
        try {
          return await puppeteerLoad( url, {
            waitAfterLoad: 20000
          } );
        }
        catch( e ) {
          return `Failure for ${url}: ${e}`;
        }
      }, {
        path: ReleaseBranch.getCheckoutDirectory( this.repo, this.branch )
      } );
    }
    catch( e ) {
      return `[ERROR] Failure to check: ${e}`;
    }
  }

  public async checkBuilt(): Promise<string | null> {
    try {
      const usesChipper2 = await this.usesChipper2();

      return await withServer( async port => {
        const url = `http://localhost:${port}/${this.repo}/build/${usesChipper2 ? 'phet/' : ''}${this.repo}_en${usesChipper2 ? '_phet' : ''}.html?fuzzMouse&fuzzTouch`;
        try {
          return puppeteerLoad( url, {
            waitAfterLoad: 20000
          } );
        }
        catch( error ) {
          return `Failure for ${url}: ${error}`;
        }
      }, {
        path: ReleaseBranch.getCheckoutDirectory( this.repo, this.branch )
      } );
    }
    catch( e ) {
      return `[ERROR] Failure to check: ${e}`;
    }
  }

  /**
   * Checks this release branch out.
   */
  public async checkout( includeNpmUpdate: boolean ): Promise<void> {
    await checkoutTarget( this.repo, this.branch, includeNpmUpdate );
  }

  /**
   * Whether this release branch includes the given SHA for the given repo dependency. Will be false if it doesn't
   * depend on this repository.
   */
  public async includesSHA( repo: string, sha: string ): Promise<boolean> {
    let result = false;

    const dependencies = JSON.parse( await getGitFile( this.repo, this.branch, 'dependencies.json' ) );

    if ( dependencies[ repo ] ) {
      const currentSHA = dependencies[ repo ].sha;
      result = sha === currentSHA || await gitIsAncestor( repo, sha, currentSHA );
    }

    return result;
  }

  /**
   * Whether this release branch does NOT include the given SHA for the given repo dependency. Will be false if it doesn't
   * depend on this repository.
   *
   */
  public async isMissingSHA( repo: string, sha: string ): Promise<boolean> {
    let result = false;

    const dependencies = JSON.parse( await getGitFile( this.repo, this.branch, 'dependencies.json' ) );

    if ( dependencies[ repo ] ) {
      const currentSHA = dependencies[ repo ].sha;
      result = sha !== currentSHA && !( await gitIsAncestor( repo, sha, currentSHA ) );
    }

    return result;
  }

  /**
   * The SHA at which this release branch's main repository diverged from main.
   *
   */
  public async getDivergingSHA(): Promise<string> {
    await gitCheckout( this.repo, this.branch );
    await gitPull( this.repo );
    await gitCheckout( this.repo, 'main' );

    return gitFirstDivergingCommit( this.repo, this.branch, 'main' );
  }

  /**
   * The timestamp at which this release branch's main repository diverged from main.
   */
  public async getDivergingTimestamp(): Promise<number> {
    return gitTimestamp( this.repo, await this.getDivergingSHA() );
  }

  /**
   * Returns the dependencies.json for this release branch
   */
  public async getDependencies(): Promise<Dependencies> {
    return getBranchDependencies( this.repo, this.branch );
  }

  /**
   * Returns the SimVersion for this release branch
   */
  public async getSimVersion(): Promise<SimVersion> {
    return getBranchVersion( this.repo, this.branch );
  }

  /**
   * Returns a list of status messages of anything out-of-the-ordinary
   */
  public async getStatus( getBranchMapAsyncCallback = getBranchMap ): Promise<string[]> {
    const results = [];

    const dependencies = await this.getDependencies();
    const dependencyNames = Object.keys( dependencies ).filter( key => {
      return key !== 'comment' && key !== this.repo && key !== 'phet-io-wrapper-sonification';
    } );

    // Check our own dependency
    if ( dependencies[ this.repo ] ) {
      try {
        const currentCommit = await gitRevParse( this.repo, this.branch );
        const previousCommit = await gitRevParse( this.repo, `${currentCommit}^` );
        if ( dependencies[ this.repo ].sha !== previousCommit ) {
          results.push( '[INFO] Potential changes (dependency is not previous commit)' );
          results.push( `[INFO] ${currentCommit} ${previousCommit} ${dependencies[ this.repo ].sha}` );
        }
        if ( ( await this.getSimVersion() ).testType === 'rc' && this.isReleased ) {
          results.push( '[INFO] Release candidate version detected (see if there is a QA issue)' );
        }
      }
      catch( e ) {
        e instanceof Error && results.push( `[ERROR] Failure to check current/previous commit: ${e.message}` );
      }
    }
    else {
      results.push( '[WARNING] Own repository not included in dependencies' );
    }

    for ( const dependency of dependencyNames ) {
      const potentialReleaseBranch = `${this.repo}-${this.branch}`;
      const branchMap = await getBranchMapAsyncCallback( dependency );

      if ( Object.keys( branchMap ).includes( potentialReleaseBranch ) ) {
        if ( dependencies[ dependency ].sha !== branchMap[ potentialReleaseBranch ] ) {
          results.push( `[WARNING] Dependency mismatch for ${dependency} on branch ${potentialReleaseBranch}` );
        }
      }
    }

    return results;
  }

  /**
   * Returns whether the sim is compatible with ES6 features
   */
  public async usesES6(): Promise<boolean> {
    const dependencies = await this.getDependencies();

    const sha = dependencies.chipper.sha;

    return gitIsAncestor( 'chipper', '80b4ad62cd8f2057b844f18d3c00cf5c0c89ed8d', sha );
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
    const dependencies = await this.getDependencies();

    const sha = dependencies.chipper.sha;

    return gitIsAncestor( 'chipper', 'e454f88ff51d1e3fabdb3a076d7407a2a9e9133c', sha );
  }

  /**
   * Returns whether phet-io.standalone is the correct phet-io query parameter (otherwise it's the newer
   * phetioStandalone).
   * Looks for the presence of https://github.com/phetsims/chipper/commit/4814d6966c54f250b1c0f3909b71f2b9cfcc7665.
   *
   */
  public async usesOldPhetioStandalone(): Promise<boolean> {
    const dependencies = await this.getDependencies();

    const sha = dependencies.chipper.sha;

    return !( await gitIsAncestor( 'chipper', '4814d6966c54f250b1c0f3909b71f2b9cfcc7665', sha ) );
  }

  /**
   * Returns whether the relativeSimPath query parameter is used for wrappers (instead of launchLocalVersion).
   * Looks for the presence of https://github.com/phetsims/phet-io/commit/e3fc26079358d86074358a6db3ebaf1af9725632
   *
   */
  public async usesRelativeSimPath(): Promise<boolean> {
    const dependencies = await this.getDependencies();

    if ( !dependencies[ 'phet-io' ] ) {
      return true; // Doesn't really matter now, does it?
    }

    const sha = dependencies[ 'phet-io' ].sha;

    return gitIsAncestor( 'phet-io', 'e3fc26079358d86074358a6db3ebaf1af9725632', sha );
  }

  /**
   * Returns whether phet-io Studio is being used instead of deprecated instance proxies wrapper.
   *
   */
  public async usesPhetioStudio(): Promise<boolean> {
    const dependencies = await this.getDependencies();

    const sha = dependencies.chipper.sha;

    return gitIsAncestor( 'chipper', '7375f6a57b5874b6bbf97a54c9a908f19f88d38f', sha );
  }

  /**
   * Returns whether phet-io Studio top-level (index.html) is used instead of studio.html.
   *
   */
  public async usesPhetioStudioIndex(): Promise<boolean> {
    const dependencies = await this.getDependencies();

    const dependency = dependencies[ 'phet-io-wrappers' ];
    if ( !dependency ) {
      return false;
    }

    const sha = dependency.sha;

    return gitIsAncestor( 'phet-io-wrappers', '7ec1a04a70fb9707b381b8bcab3ad070815ef7fe', sha );
  }

  /**
   * Returns whether the sim is a "Hydrogen" phet-io sim.
   *
   */
  public async isPhetioHydrogen(): Promise<boolean> {
    return this.brands.includes( 'phet-io' ) &&
           this.includesSHA( 'phet-io-wrappers', '7e8d97020c6451f68e898ae83aa43593b555137f' );
  }

  /**
   * Returns whether an additional folder exists in the build directory of the sim based on the brand.
   *
   */
  public async usesChipper2(): Promise<boolean> {
    const dependencies = await this.getDependencies();

    const chipperPackageJSON = JSON.parse( await gitCatFile( 'chipper', 'package.json', dependencies.chipper.sha ) );
    const chipperVersion = ChipperVersion.getFromPackageJSON( chipperPackageJSON );

    return chipperVersion.major !== 0 || chipperVersion.minor !== 0;
  }

  /**
   * Runs a predicate function with the contents of a specific file's contents in the release branch (with false if
   * it doesn't exist).
   *
   */
  public async withFile( file: string, predicate: ( contents: string ) => boolean ): Promise<boolean> {
    await this.checkout( false );

    if ( fs.existsSync( file ) ) {
      const contents = fs.readFileSync( file, 'utf-8' );
      return predicate( contents );
    }

    return false;
  }

  /**
   * Re-runs a production deploy for a specific branch (based on the SHAs at the tip of the release branch)
   */
  public async redeployBranchTipToProduction( locales = '*' ): Promise<void> {
    if ( this.isReleased ) {
      await checkoutTarget( this.repo, this.branch, false );

      const version = await getRepoVersion( this.repo );
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
   * Gets a list of ReleaseBranches which would be potential candidates for a maintenance release. This includes:
   * - All published phet brand release branches (from metadata)
   * - All published phet-io brand release branches (from metadata)
   * - All unpublished local release branches
   *
   * @rejects {ExecuteError}
   */
  public static async getAllMaintenanceBranches( unreleased = true ): Promise<ReleaseBranch[]> {
    winston.debug( 'retrieving available sim branches' );

    winston.info( 'loading phet brand ReleaseBranches' );
    const simMetadataResult = await simMetadata( {
      type: 'html'
    } );

    // Released phet branches
    const phetBranches = simMetadataResult.projects.map( simData => {
      const repo = simData.name.slice( simData.name.indexOf( '/' ) + 1 );
      const branch = `${simData.version.major}.${simData.version.minor}`;
      return new ReleaseBranch( repo, branch, [ 'phet' ], true );
    } );

    winston.info( 'loading phet-io brand ReleaseBranches' );
    const phetioBranches = ( await simPhetioMetadata( {
      active: true,
      latest: true
    } ) ).filter( simData => simData.active && simData.latest ).map( simData => {
      let branch = `${simData.versionMajor}.${simData.versionMinor}`;
      if ( simData.versionSuffix.length ) {
        branch += `-${simData.versionSuffix}`; // additional dash required
      }
      return new ReleaseBranch( simData.name, branch, [ 'phet-io' ], true );
    } );

    const unreleasedBranches = [];
    if ( unreleased ) {

      winston.info( 'loading unreleased ReleaseBranches' );
      for ( const repo of getActiveSims() ) {

        // Exclude explicitly excluded repos
        if ( JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) ).phet.ignoreForAutomatedMaintenanceReleases ) {
          continue;
        }

        const branches = await getBranches( repo );
        const releasedBranches = phetBranches.concat( phetioBranches );

        for ( const branch of branches ) {
          // We aren't unreleased if we're included in either phet or phet-io metadata.
          // See https://github.com/phetsims/balancing-act/issues/118
          if ( releasedBranches.filter( releaseBranch => releaseBranch.repo === repo && releaseBranch.branch === branch ).length ) {
            continue;
          }

          const match = branch.match( /^(\d+)\.(\d+)$/ );

          if ( match ) {
            const major = Number( match[ 1 ] );
            const minor = Number( match[ 2 ] );

            // Assumption that there is no phet-io brand sim that isn't also released with phet brand
            const projectMetadata = simMetadataResult.projects.find( project => project.name === `html/${repo}` ) || null;
            const productionVersion = projectMetadata ? projectMetadata.version : null;

            if ( !productionVersion ||
                 major > productionVersion.major ||
                 ( major === productionVersion.major && minor > productionVersion.minor ) ) {

              // Do a checkout so we can determine supported brands
              const packageObject = JSON.parse( await getFileAtBranch( repo, branch, 'package.json' ) );
              const includesPhetio = packageObject.phet && packageObject.phet.supportedBrands && packageObject.phet.supportedBrands.includes( 'phet-io' );

              const brands = [
                'phet', // Assumption that there is no phet-io brand sim that isn't also released with phet brand
                ...( includesPhetio ? [ 'phet-io' ] : [] )
              ];

              if ( !packageObject.phet.ignoreForAutomatedMaintenanceReleases ) {
                unreleasedBranches.push( new ReleaseBranch( repo, branch, brands, false ) );
              }
            }
          }
        }
      }
    }

    const allReleaseBranches = ReleaseBranch.combineLists( [ ...phetBranches, ...phetioBranches, ...unreleasedBranches ] );

    // FAMB 2.3-phetio keeps ending up in the MR list when we don't want it to, see https://github.com/phetsims/phet-io/issues/1957.
    return allReleaseBranches.filter( rb => !( rb.repo === 'forces-and-motion-basics' && rb.branch === '2.3-phetio' ) );
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

export default ReleaseBranch;