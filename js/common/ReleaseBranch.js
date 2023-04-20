// Copyright 2018, University of Colorado Boulder

/**
 * Represents a simulation release branch for deployment
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const ChipperVersion = require( './ChipperVersion' );
const checkoutTarget = require( './checkoutTarget' );
const createDirectory = require( './createDirectory' );
const execute = require( './execute' );
const getActiveSims = require( './getActiveSims' );
const getBranchDependencies = require( './getBranchDependencies' );
const getBranches = require( './getBranches' );
const getBuildArguments = require( './getBuildArguments' );
const getDependencies = require( './getDependencies' );
const getBranchMap = require( './getBranchMap' );
const getBranchVersion = require( './getBranchVersion' );
const getFileAtBranch = require( './getFileAtBranch' );
const gitCheckout = require( './gitCheckout' );
const gitFetch = require( './gitFetch' );
const gitFirstDivergingCommit = require( './gitFirstDivergingCommit' );
const gitIsAncestor = require( './gitIsAncestor' );
const gitPull = require( './gitPull' );
const gitRevParse = require( './gitRevParse' );
const gitTimestamp = require( './gitTimestamp' );
const gruntCommand = require( './gruntCommand' );
const npmCommand = require( './npmCommand' );
const puppeteerLoad = require( './puppeteerLoad' );
const simMetadata = require( './simMetadata' );
const simPhetioMetadata = require( './simPhetioMetadata' );
const withServer = require( './withServer' );
const assert = require( 'assert' );
const fs = require( 'fs' );
const winston = require( 'winston' );

module.exports = ( function() {

  //REVIEW: Rename to 'release-branches'
  const MAINTENANCE_DIRECTORY = '../.maintenance';

  class ReleaseBranch {
    /**
     * @public
     * @constructor
     *
     * @param {string} repo
     * @param {string} branch
     * @param {Array.<string>} brands
     * @param {boolean} isReleased
     */
    constructor( repo, branch, brands, isReleased ) {
      assert( typeof repo === 'string' );
      assert( typeof branch === 'string' );
      assert( Array.isArray( brands ) );
      assert( typeof isReleased === 'boolean' );

      // @public {string}
      this.repo = repo;
      this.branch = branch;

      // @public {Array.<string>}
      this.brands = brands;

      // @public {boolean}
      this.isReleased = isReleased;
    }

    /**
     * Convert into a plain JS object meant for JSON serialization.
     * @public
     *
     * @returns {Object}
     */
    serialize() {
      return {
        repo: this.repo,
        branch: this.branch,
        brands: this.brands,
        isReleased: this.isReleased
      };
    }

    /**
     * Takes a serialized form of the ReleaseBranch and returns an actual instance.
     * @public
     *
     * @param {Object}
     * @returns {ReleaseBranch}
     */
    static deserialize( { repo, branch, brands, isReleased } ) {
      return new ReleaseBranch( repo, branch, brands, isReleased );
    }

    /**
     * Returns whether the two release branches contain identical information.
     * @public
     *
     * @param {ReleaseBranch} releaseBranch
     * @returns {boolean}
     */
    equals( releaseBranch ) {
      return this.repo === releaseBranch.repo &&
             this.branch === releaseBranch.branch &&
             this.brands.join( ',' ) === releaseBranch.brands.join( ',' ) &&
             this.isReleased === releaseBranch.isReleased;
    }

    /**
     * Converts it to a (debuggable) string form.
     * @public
     *
     * @returns {string}
     */
    toString() {
      return `${this.repo} ${this.branch} ${this.brands.join( ',' )}${this.isReleased ? '' : ' (unpublished)'}`;
    }

    /**
     * @public
     *
     * @param repo {string}
     * @param branch {string}
     * @returns {string}
     */
    static getCheckoutDirectory( repo, branch ) {
      return `${MAINTENANCE_DIRECTORY}/${repo}-${branch}`;
    }

    /**
     * Returns the maintenance directory, for things that want to use it directly.
     * @public
     *
     * @returns {string}
     */
    static getMaintenanceDirectory() {
      return MAINTENANCE_DIRECTORY;
    }

    /**
     * Returns the path (relative to the repo) to the built phet-brand HTML file
     * @public
     *
     * @returns {Promise<string>}
     */
    async getLocalPhetBuiltHTMLPath() {
      const usesChipper2 = await this.usesChipper2();

      return `build/${usesChipper2 ? 'phet/' : ''}${this.repo}_en${usesChipper2 ? '_phet' : ''}.html`;
    }

    /**
     * Returns the path (relative to the repo) to the built phet-io-brand HTML file
     * @public
     *
     * @returns {Promise<string>}
     */
    async getLocalPhetIOBuiltHTMLPath() {
      const usesChipper2 = await this.usesChipper2();

      return `build/${usesChipper2 ? 'phet-io/' : ''}${this.repo}${usesChipper2 ? '_all_phet-io' : '_en-phetio'}.html`;
    }

    /**
     * Returns the query parameter to use for activating phet-io standalone mode
     * @public
     *
     * @returns {Promise<string>}
     */
    async getPhetioStandaloneQueryParameter() {
      return ( await this.usesOldPhetioStandalone() ) ? 'phet-io.standalone' : 'phetioStandalone';
    }

    /**
     * @public
     */
    async updateCheckout() {
      winston.info( `updating checkout for ${this.toString()}` );

      //REVIEW: We can avoid thrashing our main copy here (or needing it) by using the maintenance directory checkout
      //REVIEW: for the repo. We'll somehow have to get it cloned first (worth it?)
      await gitFetch( this.repo );
      await gitCheckout( this.repo, this.branch );
      await gitPull( this.repo );
      const dependencies = await getDependencies( this.repo );
      await gitCheckout( this.repo, 'master' );

      //REVIEW: make this more parallelizable (NPM and main copy thrashing)

      if ( !fs.existsSync( MAINTENANCE_DIRECTORY ) ) {
        winston.info( `creating directory ${MAINTENANCE_DIRECTORY}` );
        await createDirectory( MAINTENANCE_DIRECTORY );
      }
      const checkoutDirectory = ReleaseBranch.getCheckoutDirectory( this.repo, this.branch );
      if ( !fs.existsSync( checkoutDirectory ) ) {
        winston.info( `creating directory ${checkoutDirectory}` );
        await createDirectory( checkoutDirectory );
      }

      dependencies.babel = { sha: 'master', branch: 'master' };

      const dependencyRepos = Object.keys( dependencies ).filter( repo => repo !== 'comment' );

      await Promise.all( dependencyRepos.map( async repo => {
        const repoPwd = `${checkoutDirectory}/${repo}`;

        if ( !fs.existsSync( `${checkoutDirectory}/${repo}` ) ) {
          winston.info( `cloning repo ${repo} in ${checkoutDirectory}` );
          if ( repo === 'perennial-alias' ) {
            await execute( 'git', [ 'clone', 'https://github.com/phetsims/perennial.git', repo ], `${checkoutDirectory}` );
          }
          else {
            await execute( 'git', [ 'clone', `https://github.com/phetsims/${repo}.git` ], `${checkoutDirectory}` );
          }
        }
        else {
          await execute( 'git', [ 'fetch' ], repoPwd );
        }

        await execute( 'git', [ 'checkout', dependencies[ repo ].sha ], repoPwd );

        if ( repo === 'chipper' || repo === 'perennial-alias' || repo === this.repo ) {
          winston.info( `npm ${repo} in ${checkoutDirectory}` );

          //REVIEW: Allow these to lock and be parallelized safely
          await execute( npmCommand, [ 'prune' ], repoPwd );
          await execute( npmCommand, [ 'update' ], repoPwd );
        }
      } ) );
    }

    /**
     * @public
     */
    async build() {
      const checkoutDirectory = ReleaseBranch.getCheckoutDirectory( this.repo, this.branch );
      const repoDirectory = `${checkoutDirectory}/${this.repo}`;

      const chipperVersion = ChipperVersion.getFromPackageJSON(
        JSON.parse( fs.readFileSync( `${checkoutDirectory}/chipper/package.json`, 'utf8' ) )
      );

      const args = getBuildArguments( chipperVersion, {
        brands: this.brands,
        allHTML: true,
        debugHTML: true
      } );

      winston.info( `building ${checkoutDirectory} with grunt ${args.join( ' ' )}` );
      await execute( gruntCommand, args, repoDirectory );
    }

    /**
     * @public
     */
    async transpile() {
      const checkoutDirectory = ReleaseBranch.getCheckoutDirectory( this.repo, this.branch );
      const repoDirectory = `${checkoutDirectory}/${this.repo}`;

      winston.info( `transpiling ${checkoutDirectory}` );

      // We might not be able to run this command!
      await execute( gruntCommand, [ 'output-js-project' ], repoDirectory, {
        errors: 'resolve'
      } );
    }

    /**
     * @public
     *
     * @returns {Promise<string|null>} - Error string, or null if no error
     */
    async checkUnbuilt() {
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

    /**
     * @public
     *
     * @returns {Promise<string|null>} - Error string, or null if no error
     */
    async checkBuilt() {
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
     * @public
     *
     * @param {boolean} includeNpmUpdate
     */
    async checkout( includeNpmUpdate ) {
      await checkoutTarget( this.repo, this.branch, includeNpmUpdate );
    }

    /**
     * Whether this release branch includes the given SHA for the given repo dependency. Will be false if it doesn't
     * depend on this repository.
     * @public
     *
     * @param {string} repo
     * @param {string} sha
     * @returns {Promise.<boolean>}
     */
    async includesSHA( repo, sha ) {
      let result = false;

      await gitCheckout( this.repo, this.branch );

      const dependencies = await getDependencies( this.repo );

      if ( dependencies[ repo ] ) {
        const currentSHA = dependencies[ repo ].sha;
        result = sha === currentSHA || await gitIsAncestor( repo, sha, currentSHA );
      }

      await gitCheckout( this.repo, 'master' );

      return result;
    }

    /**
     * Whether this release branch does NOT include the given SHA for the given repo dependency. Will be false if it doesn't
     * depend on this repository.
     * @public
     *
     * @param {string} repo
     * @param {string} sha
     * @returns {Promise.<boolean>}
     */
    async isMissingSHA( repo, sha ) {
      let result = false;

      await gitCheckout( this.repo, this.branch );

      const dependencies = await getDependencies( this.repo );

      if ( dependencies[ repo ] ) {
        const currentSHA = dependencies[ repo ].sha;
        result = sha !== currentSHA && !( await gitIsAncestor( repo, sha, currentSHA ) );
      }

      await gitCheckout( this.repo, 'master' );

      return result;
    }

    /**
     * The SHA at which this release branch's main repository diverged from master.
     * @public
     *
     * @returns {Promise.<string>}
     */
    async getDivergingSHA() {
      await gitCheckout( this.repo, this.branch );
      await gitPull( this.repo );
      await gitCheckout( this.repo, 'master' );

      return gitFirstDivergingCommit( this.repo, this.branch, 'master' );
    }

    /**
     * The timestamp at which this release branch's main repository diverged from master.
     * @public
     *
     * @returns {Promise.<number>}
     */
    async getDivergingTimestamp() {
      return gitTimestamp( this.repo, await this.getDivergingSHA() );
    }

    /**
     * Returns the dependencies.json for this release branch
     * @public
     *
     * @returns {Promise}
     */
    async getDependencies() {
      return getBranchDependencies( this.repo, this.branch );
    }

    /**
     * Returns the SimVersion for this release branch
     * @public
     *
     * @returns {Promise<SimVersion>}
     */
    async getSimVersion() {
      return getBranchVersion( this.repo, this.branch );
    }

    /**
     * Returns a list of status messages of anything out-of-the-ordinary
     * @public
     *
     * @returns {Promise.<Array.<string>>}
     */
    async getStatus( getBranchMapAsyncCallback = getBranchMap ) {
      const results = [];

      const dependencies = await this.getDependencies();
      const dependencyNames = Object.keys( dependencies ).filter( key => {
        return key !== 'comment' && key !== this.repo;
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
          results.push( `[ERROR] Failure to check current/previous commit: ${e.message}` );
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
     * @public
     *
     * @returns {Promise<boolean>}
     */
    async usesES6() {
      await gitCheckout( this.repo, this.branch );
      const dependencies = await getDependencies( this.repo );
      const sha = dependencies.chipper.sha;
      await gitCheckout( this.repo, 'master' );

      return gitIsAncestor( 'chipper', '80b4ad62cd8f2057b844f18d3c00cf5c0c89ed8d', sha );
    }

    /**
     * Returns whether this sim uses initialize-globals based query parameters
     * @public
     *
     * If true:
     *   phet.chipper.queryParameters.WHATEVER
     *   AND it needs to be in the schema
     *
     * If false:
     *   phet.chipper.getQueryParameter( 'WHATEVER' )
     *   FLAGS should use !!phet.chipper.getQueryParameter( 'WHATEVER' )
     *
     * @returns {Promise<boolean>}
     */
    async usesInitializeGlobalsQueryParameters() {
      await gitCheckout( this.repo, this.branch );
      const dependencies = await getDependencies( this.repo );
      const sha = dependencies.chipper.sha;
      await gitCheckout( this.repo, 'master' );

      return gitIsAncestor( 'chipper', 'e454f88ff51d1e3fabdb3a076d7407a2a9e9133c', sha );
    }

    /**
     * Returns whether phet-io.standalone is the correct phet-io query parameter (otherwise it's the newer
     * phetioStandalone).
     * Looks for the presence of https://github.com/phetsims/chipper/commit/4814d6966c54f250b1c0f3909b71f2b9cfcc7665.
     * @public
     *
     * @returns {Promise.<boolean>}
     */
    async usesOldPhetioStandalone() {
      await gitCheckout( this.repo, this.branch );
      const dependencies = await getDependencies( this.repo );
      const sha = dependencies.chipper.sha;
      await gitCheckout( this.repo, 'master' );

      return !( await gitIsAncestor( 'chipper', '4814d6966c54f250b1c0f3909b71f2b9cfcc7665', sha ) );
    }

    /**
     * Returns whether the relativeSimPath query parameter is used for wrappers (instead of launchLocalVersion).
     * Looks for the presence of https://github.com/phetsims/phet-io/commit/e3fc26079358d86074358a6db3ebaf1af9725632
     * @public
     *
     * @returns {Promise.<boolean>}
     */
    async usesRelativeSimPath() {
      await gitCheckout( this.repo, this.branch );
      const dependencies = await getDependencies( this.repo );

      if ( !dependencies[ 'phet-io' ] ) {
        return true; // Doesn't really matter now, does it?
      }

      const sha = dependencies[ 'phet-io' ].sha;
      await gitCheckout( this.repo, 'master' );

      return gitIsAncestor( 'phet-io', 'e3fc26079358d86074358a6db3ebaf1af9725632', sha );
    }

    /**
     * Returns whether phet-io Studio is being used instead of deprecated instance proxies wrapper.
     * @public
     *
     * @returns {Promise.<boolean>}
     */
    async usesPhetioStudio() {
      await gitCheckout( this.repo, this.branch );
      const dependencies = await getDependencies( this.repo );

      const sha = dependencies.chipper.sha;
      await gitCheckout( this.repo, 'master' );

      return gitIsAncestor( 'chipper', '7375f6a57b5874b6bbf97a54c9a908f19f88d38f', sha );
    }

    /**
     * Returns whether phet-io Studio top-level (index.html) is used instead of studio.html.
     * @public
     *
     * @returns {Promise.<boolean>}
     */
    async usesPhetioStudioIndex() {
      await gitCheckout( this.repo, this.branch );
      const dependencies = await getDependencies( this.repo );

      const dependency = dependencies[ 'phet-io-wrappers' ];
      if ( !dependency ) {
        return false;
      }

      const sha = dependency.sha;
      await gitCheckout( this.repo, 'master' );

      return gitIsAncestor( 'phet-io-wrappers', '7ec1a04a70fb9707b381b8bcab3ad070815ef7fe', sha );
    }

    /**
     * Returns whether an additional folder exists in the build directory of the sim based on the brand.
     * @public
     *
     * @returns {Promise.<boolean>}
     */
    async usesChipper2() {
      await gitCheckout( this.repo, this.branch );
      const dependencies = await getDependencies( this.repo );
      await gitCheckout( 'chipper', dependencies.chipper.sha );

      const chipperVersion = ChipperVersion.getFromRepository();

      const result = chipperVersion.major !== 0 || chipperVersion.minor !== 0;

      await gitCheckout( this.repo, 'master' );
      await gitCheckout( 'chipper', 'master' );

      return result;
    }

    /**
     * Runs a predicate function with the contents of a specific file's contents in the release branch (with false if
     * it doesn't exist).
     * @public
     *
     * @param {string} file
     * @param {function(contents:string):boolean} predicate
     * @returns {Promise.<boolean>}
     */
    async withFile( file, predicate ) {
      await this.checkout( false );

      if ( fs.existsSync( file ) ) {
        const contents = fs.readFileSync( file, 'utf-8' );
        return predicate( contents );
      }

      return false;
    }

    /**
     * Gets a list of ReleaseBranches which would be potential candidates for a maintenance release. This includes:
     * - All published phet brand release branches (from metadata)
     * - All published phet-io brand release branches (from metadata)
     * - All unpublished local release branches
     *
     * @public
     * @returns {Promise.<ReleaseBranch[]>}
     * @rejects {ExecuteError}
     */
    static async getAllMaintenanceBranches() {
      winston.debug( 'retrieving available sim branches' );

      console.log( 'loading phet brand ReleaseBranches' );
      const simMetadataResult = await simMetadata( {
        type: 'html'
      } );

      // Released phet branches
      const phetBranches = simMetadataResult.projects.map( simData => {
        const repo = simData.name.slice( simData.name.indexOf( '/' ) + 1 );
        const branch = `${simData.version.major}.${simData.version.minor}`;
        return new ReleaseBranch( repo, branch, [ 'phet' ], true );
      } );

      console.log( 'loading phet-io brand ReleaseBranches' );
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

      console.log( 'loading unreleased ReleaseBranches' );
      const unreleasedBranches = [];
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

      return ReleaseBranch.combineLists( [ ...phetBranches, ...phetioBranches, ...unreleasedBranches ] );
    }

    /**
     * Combines multiple matching ReleaseBranches into one where appropriate, and sorts. For example, two ReleaseBranches
     * of the same repo but for different brands are combined into a single ReleaseBranch with multiple brands.
     * @public
     *
     * @param {Array.<ReleaseBranch>} simBranches
     * @returns {Array.<ReleaseBranch>}
     */
    static combineLists( simBranches ) {
      const resultBranches = [];

      for ( const simBranch of simBranches ) {
        let foundBranch = false;
        for ( const resultBranch of resultBranches ) {
          if ( simBranch.repo === resultBranch.repo && simBranch.branch === resultBranch.branch ) {
            foundBranch = true;
            resultBranch.brands = [ ...resultBranch.brands, ...simBranch.brands ];
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

  return ReleaseBranch;
} )();
