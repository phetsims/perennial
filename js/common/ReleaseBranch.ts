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
import buildLocal from './buildLocal.js';
import buildServerRequest from './buildServerRequest.js';
import checkoutMain from './checkoutMain.js';
import checkoutTarget from './checkoutTarget.js';
import chipperSupportsOutputJSGruntTasks from './chipperSupportsOutputJSGruntTasks.js';
import ChipperVersion from './ChipperVersion.js';
import createDirectory from './createDirectory.js';
import execute, { ExecuteOptions } from './execute.js';
import getActiveSims from './getActiveSims.js';
import getBranchDependencies from './getBranchDependencies.js';
import getBranchSHAMap from './getBranchSHAMap.js';
import { getBranchVersion } from './getBranchVersion.js';
import getBuildArguments, { BuildOptions } from './getBuildArguments.js';
import getDependencies from './getDependencies.js';
import getGitFile from './getGitFile.js';
import { getRunnableVersion } from './getRunnableVersion.js';
import gitCatFile from './gitCatFile.js';
import gitCheckout from './gitCheckout.js';
import gitCheckoutDirectory from './gitCheckoutDirectory.js';
import gitCloneOrFetchDirectory from './gitCloneOrFetchDirectory.js';
import { gitFirstDivergingCommit } from './gitFirstDivergingCommit.js';
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
import { gitCreateWorktree } from './gitCreateWorktree.js';
import { getBranches } from './getBranches.js';
import { getFileAtBranch } from './getFileAtBranch.js';
import { createLocalBranchFromRemote } from './createLocalBranchFromRemote.js';
import { Branch, WORKTREE_DIRECTORY } from './Branch.js';
import { gitIsAncestor } from './gitIsAncestor.js';

const MAINTENANCE_DIRECTORY = '../release-branches';

type ReleaseBranchSerialized = {
  repo: string;
  branch: string;
  brands: string[];
  isReleased: boolean;
};

class ReleaseBranch extends Branch implements ReleaseBranchSerialized {

  // Cache for the timestamp string of the diverging commit, since it can be expensive to calculate and is used in multiple places.
  public cachedTimestampString: string | null = null;

  public constructor(
    public readonly repo: string,
    public readonly branch: string,
    public readonly brands: string[],
    public readonly isReleased: boolean
  ) {
    assert( Array.isArray( brands ) );

    super( `releases/${repo}/${branch}` );
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
  public override toString(): string {
    return `${this.repo} ${this.branch} ${this.brands.join( ',' )}${this.isReleased ? '' : ' (unpublished)'}`;
  }

  /**
   * TODO: remove
   * @deprecated
   *
   * @param repo {string}
   * @param branch {string}
   */
  public static getCheckoutDirectory( repo: string, branch: string ): string {
    return `${MAINTENANCE_DIRECTORY}/${repo}-${branch}`;
  }

  /**
   * TODO: remove
   * @deprecated
   *
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

  public async getChipperVersion(): Promise<ChipperVersion> {
    const packageJSONString = await getFileAtBranch( this.totalityBranch, 'chipper/package.json' );

    return ChipperVersion.getFromPackageJSON( JSON.parse( packageJSONString ) );
  }

  /**
   * @deprecated
   * TODO: Remove
   */
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

      // For our sim repo itself, check out the branch explicitly (so we have the latest commit, not the second-to-latest).
      await gitCheckoutDirectory( repo === this.repo ? this.branch : sha, repoPwd );

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

  public async build( options?: Partial<BuildOptions>, executeOptions?: ExecuteOptions & { errors?: 'reject' } ): Promise<void> {
    const worktreeDirectory = this.getWorktreeDirectory();
    const repoDirectory = `${worktreeDirectory}/${this.repo}`;

    const args = getBuildArguments( await this.getChipperVersion(), _.merge( {
      brands: this.brands,
      allHTML: true,
      debugHTML: true,
      lint: false,
      locales: '*'
    }, options ) );

    winston.info( `building ${worktreeDirectory} with grunt ${args.join( ' ' )}` );
    await execute( gruntCommand, args, repoDirectory, executeOptions );
  }

  public async transpile(): Promise<void> {
    const worktreeDirectory = this.getWorktreeDirectory();
    const repoDirectory = `${worktreeDirectory}/${this.repo}`;

    if ( chipperSupportsOutputJSGruntTasks() ) {
      winston.info( `transpiling ${worktreeDirectory}` );

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
        path: this.getWorktreeDirectory()
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
        path: this.getWorktreeDirectory()
      } );
    }
    catch( e ) {
      return `[ERROR] Failure to check: ${e}`;
    }
  }

  /**
   * @deprecated
   * TODO: Remove
   *
   * Checks this release branch out.
   */
  public async checkout( includeNpmUpdate: boolean ): Promise<void> {
    await checkoutTarget( this.repo, this.branch, includeNpmUpdate );
  }

  /**
   * Whether the totality branch for this release branch includes the given SHA.
   * NOTE: octopus merges were done for legacy release branches, so ideally finding the totality SHA of an older polyrepo
   * commit will allow this to work.
   */
  public async includesSHA( sha: string ): Promise<boolean> {
    return gitIsAncestor( sha, this.totalityBranch );
  }

  /**
   * Whether the totality branch for this release branch is missing the given SHA.
   * NOTE: octopus merges were done for legacy release branches, so ideally finding the totality SHA of an older polyrepo
   * commit will allow this to work.
   */
  public async isMissingSHA( sha: string ): Promise<boolean> {
    const currentSHA = await gitRevParse( this.repo, this.branch );

    return sha !== currentSHA && !( await this.includesSHA( sha ) );
  }

  /**
   * The SHA at which this release branch's main repository diverged from main.
   */
  public async getDivergingSHA(): Promise<string> {
    await createLocalBranchFromRemote( this.totalityBranch );

    return gitFirstDivergingCommit( this.totalityBranch, 'main' );
  }

  /**
   * The timestamp at which this release branch's main repository diverged from main.
   */
  public async getDivergingTimestamp(): Promise<number> {
    return gitTimestamp( this.repo, await this.getDivergingSHA() );
  }

  /**
   * TODO: Remove
   * @deprecated
   *
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
   * // TODO: UPDATE THIS so it only checks for the last SHA whether it is an "update" deployed message!
   * Returns a list of status messages of anything out-of-the-ordinary
   */
  public async getStatus( getBranchSHAMapAsyncCallback = getBranchSHAMap ): Promise<string[]> {
    const results = [];

    throw new Error( 'unimplemented' );

    return results;
  }

  /**
   * Returns the file contents for ${repo}/${relativeFile} if it exists on this release branch,
   * or if it doesn't exist, returns an empty string (for convenience of branch string handling).
   *
   * This will be more performant than getSourceFileOptionalContents, but getSourceFileOptionalContents is recommended
   * for in-general use due to its flexibility.
   */
  public async getFileOptionalContents( repo: string, relativeFile: string ): Promise<string> {
    const dependencies = await this.getDependencies();

    const sha = dependencies[ repo ].sha;

    if ( !sha ) {
      throw new Error( `Need a sha for getFileOptionalContents: ${repo} ${relativeFile}` );
    }

    try {
      return await getGitFile( repo, sha, relativeFile );
    }
    catch( e ) {
      return '';
    }
  }

  /**
   * Returns the file contents for ${repo}/${relativeFile} (with optional .ts and .js suffixes added),
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
  public async getSourceFileOptionalContents( repo: string, relativeFile: string ): Promise<string> {

    let fileContents = await this.getFileOptionalContents( repo, relativeFile );

    if ( !fileContents.length ) {
      fileContents = await this.getFileOptionalContents( repo, `${relativeFile}.ts` );
    }

    if ( !fileContents.length ) {
      fileContents = await this.getFileOptionalContents( repo, `${relativeFile}.js` );
    }

    return fileContents;
  }

  /**
   * Checks whether it is likely that the given file has an import for something. Used for convenience during
   * complicated maintenance releases.
   */
  public async hasLikelyImport( repo: string, relativeFile: string, name: string ): Promise<boolean> {
    const contents = await this.getSourceFileOptionalContents( repo, relativeFile );

    return contents.split( '\n' ).some( line => {
      return ( line.includes( 'import' ) || line.includes( 'require' ) ) && line.includes( name );
    } );
  }

  /**
   * Returns whether the sim is compatible with ES6 features
   */
  public async usesES6(): Promise<boolean> {
    // chipper polyrepo 80b4ad62cd8f2057b844f18d3c00cf5c0c89ed8d
    return gitIsAncestor( 'be95288d3a5867fb38fd43936d5c8a473c2f0e17', this.totalityBranch );
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
    return gitIsAncestor( '24dae95fdc221af4513684112b1addb8a1f7c10d', this.totalityBranch );
  }

  /**
   * Returns whether phet-io.standalone is the correct phet-io query parameter (otherwise it's the newer
   * phetioStandalone).
   *
   */
  public async usesOldPhetioStandalone(): Promise<boolean> {
    // chipper polyrepo 4814d6966c54f250b1c0f3909b71f2b9cfcc7665
    return gitIsAncestor( '6aa2943d55f673921609b7e76b6a808e033e439c', this.totalityBranch );
  }

  /**
   * Returns whether the relativeSimPath query parameter is used for wrappers (instead of launchLocalVersion).
   *
   */
  public async usesRelativeSimPath(): Promise<boolean> {
    // phet-io polyrepo e3fc26079358d86074358a6db3ebaf1af9725632
    return !this.brands.includes( 'phet-io' ) || await gitIsAncestor( '7f1f7a9470d9ced8edcb26837ff431cd61afa517', this.totalityBranch );;
  }

  /**
   * Returns whether phet-io Studio is being used instead of deprecated instance proxies wrapper.
   *
   */
  public async usesPhetioStudio(): Promise<boolean> {
    // chipper polyrepo 7375f6a57b5874b6bbf97a54c9a908f19f88d38f
    return gitIsAncestor( 'fc479b2d8eb2ff354543e6cebe5c1bfbb44bb1cc', this.totalityBranch );
  }

  /**
   * Returns whether phet-io Studio top-level (index.html) is used instead of studio.html.
   *
   */
  public async usesPhetioStudioIndex(): Promise<boolean> {
    // phet-io-wrappers polyrepo 7ec1a04a70fb9707b381b8bcab3ad070815ef7fe
    return !this.brands.includes( 'phet-io' ) || await gitIsAncestor( '46fdcc098ba3b84e6f39d8506828c4ad629ef206', this.totalityBranch );;
  }

  /**
   * Returns whether the sim is a "Hydrogen" phet-io sim.
   */
  public async isPhetioHydrogen(): Promise<boolean> {
    // phet-io-wrappers polyrepo 7e8d97020c6451f68e898ae83aa43593b555137f
    return !this.brands.includes( 'phet-io' ) || await gitIsAncestor( '8c175d14c0d467d0e457f47a5f496455d2370b31', this.totalityBranch );;
  }

  /**
   * Returns whether the sim is built with XHTML
   */
  public async hasXHTML(): Promise<boolean> {
    // chipper polyrepo 70c2d4b0cb0cb0cb457190e3ca889c406b663686
    return gitIsAncestor( '8a26d07ea32b04ec3fbe7efa60c180ec45c99273', this.totalityBranch );
  }

  /**
   * Returns whether the sim supports interactive description.
   */
  public async supportsInteractiveDescription(): Promise<boolean> {
    const packageJSON = await this.getPackageJSON();
    const phet = packageJSON?.phet ?? {};
    const simFeatures = phet.simFeatures ?? {};

    // The name and location of the a11y flag in package.json has changed
    // over time,
    const accessibilityInFeatures = simFeatures.supportsInteractiveDescription || simFeatures.supportsDescription;
    const accessibilityInPhet = phet.supportsInteractiveDescriptions || phet.accessible || phet.supportsInteractiveDescription;

    return !!( accessibilityInFeatures || accessibilityInPhet );
  }

  /**
   * Returns the package.json parsed as a plain JS object.
   */
  public async getPackageJSON(): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    return JSON.parse( await gitCatFile( this.repo, 'package.json', this.branch ) );
  }

  /**
   * Returns whether an additional folder exists in the build directory of the sim based on the brand.
   */
  public async usesChipper2(): Promise<boolean> {
    const dependencies = await this.getDependencies();

    const chipperPackageJSON = JSON.parse( await gitCatFile( 'chipper', 'package.json', dependencies.chipper.sha ) );
    const chipperVersion = ChipperVersion.getFromPackageJSON( chipperPackageJSON );

    return chipperVersion.major !== 0 || chipperVersion.minor !== 0;
  }

  public async hasMigrationWrapper(): Promise<boolean> {
    // phet-io-wrappers polyrepo d8ad7267614d1b7cf3fc2d0d9cc11e3c592ac1ce
    return !this.brands.includes( 'phet-io' ) || await gitIsAncestor( '2328bdd8bacff4bf3858c8eef1bcc3c1dc648cad', this.totalityBranch );;
  }

  /**
   * Returns the timestamp string with the date of when this release branch diverged from main.
   */
  public async getDivergingTimestampString(): Promise<string> {
    const divergingCommit = await gitFirstDivergingCommit( this.totalityBranch, 'main' );
    const timestamp = await gitTimestamp( this.repo, divergingCommit );
    return new Date( timestamp ).toISOString().split( 'T' )[ 0 ];
  }

  /**
   * Runs a predicate function with the contents of a specific file's contents in the release branch (with false if
   * it doesn't exist).
   */
  public async withFile( file: string, predicate: ( contents: string ) => boolean ): Promise<boolean> {
    await this.checkout( false );

    if ( fs.existsSync( file ) ) {
      const contents = fs.readFileSync( file, 'utf-8' );
      return predicate( contents );
    }

    return false;
  }

  public async updateWorktree(): Promise<void> {
    winston.info( `updating worktree for ${this.toString()}` );

    // Create the container directory
    await this.ensureWorktreeParentDirectory();

    const worktreeDirectory = this.getWorktreeDirectory();

    // Ensure our remote tracking is set up properly
    await createLocalBranchFromRemote( this.totalityBranch );

    // Create the worktree itself if needed
    if ( !fs.existsSync( worktreeDirectory ) ) {
      winston.info( `creating worktree at ${worktreeDirectory}` );
      await gitCreateWorktree( worktreeDirectory, this.totalityBranch );
    }
    else {
      winston.info( `pulling worktree at ${worktreeDirectory}` );
      await gitPullDirectory( worktreeDirectory );
    }

    if ( fs.existsSync( `${worktreeDirectory}/babel` ) ) {
      winston.info( 'pulling babel in worktree' );
      await execute( 'git', [ 'pull' ], `${worktreeDirectory}/babel` );
    }
    else {
      winston.info( 'cloning babel into worktree' );
      await execute( 'git', [ 'clone', 'https://github.com/phetsims/babel.git' ], worktreeDirectory );
    }

    for ( const npmRepo of [ 'chipper', 'perennial-alias', this.repo ] ) {
      if ( fs.existsSync( `${worktreeDirectory}/${npmRepo}` ) ) {
        winston.info( `npm update ${npmRepo} in worktree` );
        await npmUpdateDirectory( `${worktreeDirectory}/${npmRepo}` );
      }
    }
  }

  public async removeWorktree(): Promise<void> {
    const worktreeDirectory = this.getWorktreeDirectory();

    if ( fs.existsSync( worktreeDirectory ) ) {
      winston.info( `removing worktree at ${worktreeDirectory}` );

      // double-force for babel
      await execute( 'git', [ 'worktree', 'remove', worktreeDirectory, '--force', '--force' ], '.' );
    }
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

    const unreleasedBranches: ReleaseBranch[] = [];
    if ( unreleased ) {

      winston.info( 'loading unreleased ReleaseBranches' );

      const releasedBranches = phetBranches.concat( phetioBranches );

      const activeSims = getActiveSims();
      const branches = await getBranches();
      for ( const totalityBranch of branches ) {
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

        // We aren't unreleased if we're included in either phet or phet-io metadata.
        // See https://github.com/phetsims/balancing-act/issues/118
        if ( releasedBranches.filter( releaseBranch => releaseBranch.repo === repo && releaseBranch.branch === branch ).length ) {
          continue;
        }

        console.log( `checking unreleased branch ${repo} ${branch}` );

        // Assumption that there is no phet-io brand sim that isn't also released with phet brand
        const projectMetadata = simMetadataResult.projects.find( project => project.name === `html/${repo}` ) || null;
        const productionVersion = projectMetadata ? projectMetadata.version : null;

        if ( !productionVersion ||
             major > productionVersion.major ||
             ( major === productionVersion.major && minor > productionVersion.minor ) ) {

          // Determine supported brands
          const packageObject = JSON.parse( await getFileAtBranch( totalityBranch, `${repo}/package.json` ) );
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