// Copyright 2018, University of Colorado Boulder

/**
 * Represents a simulation release branch for deployment
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

const ChipperVersion = require( './ChipperVersion' );
const build = require( './build' );
const checkoutMaster = require( './checkoutMaster' );
const checkoutTarget = require( './checkoutTarget' );
const getActiveSims = require( './getActiveSims' );
const getBranches = require( './getBranches' );
const getDependencies = require( './getDependencies' );
const getRepoVersion = require( './getRepoVersion' );
const gitCheckout = require( './gitCheckout' );
const gitIsAncestor = require( './gitIsAncestor' );
const gitPull = require( './gitPull' );
const gitRevParse = require( './gitRevParse' );
const puppeteerLoad = require( './puppeteerLoad' );
const simMetadata = require( './simMetadata' );
const simPhetioMetadata = require( './simPhetioMetadata' );
const withServer = require( './withServer' );
const assert = require( 'assert' );
const fs = require( 'fs' );
const _ = require( 'lodash' ); // eslint-disable-line
const winston = require( 'winston' );

module.exports = ( function() {

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

      await checkoutTarget( this.repo, this.branch, false ); // don't npm update

      const dependencies = await getDependencies( this.repo );

      if ( dependencies[ repo ] ) {
        const currentSHA = await gitRevParse( repo, 'HEAD' );
        result = sha === currentSHA || await gitIsAncestor( repo, sha, currentSHA );
      }

      await checkoutMaster( this.repo, false ); // don't npm update

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

      await checkoutTarget( this.repo, this.branch, false ); // don't npm update

      const dependencies = await getDependencies( this.repo );

      if ( dependencies[ repo ] ) {
        const currentSHA = await gitRevParse( repo, 'HEAD' );
        result = sha !== currentSHA && !( await gitIsAncestor( repo, sha, currentSHA ) );
      }

      await checkoutMaster( this.repo, false ); // don't npm update

      return result;
    }

    /**
     * Returns a list of status messages of anything out-of-the-ordinary
     * @public
     *
     * @param {Object} [options]
     * @returns {Promise.<Array.<string>>}
     */
    async getStatus( options ) {
      // TODO: fuzzing (see when different fuzz query parameters existed?)

      options = _.extend( { // eslint-disable-line
        checkUnbuilt: true,
        build: true,
        checkBuilt: true,
        checkPhetmarks: true
      }, options );

      if ( options.checkBuilt ) {
        assert( options.build, 'checkBuilt requires build' );
      }

      const results = [];

      const usesChipper2 = await this.usesChipper2();

      await checkoutTarget( this.repo, this.branch, options.build );

      const dependencies = await getDependencies( this.repo );
      const dependencyNames = Object.keys( dependencies ).filter( key => {
        return key !== 'comment' && key !== this.repo;
      } );

      // Check our own dependency
      if ( dependencies[ this.repo ] ) {
        try {
          const currentCommit = await gitRevParse( this.repo, 'HEAD' );
          const previousCommit = await gitRevParse( this.repo, `${currentCommit}^` );
          if ( dependencies[ this.repo ].sha !== previousCommit ) {
            results.push( '[INFO] Potential changes (dependency is not previous commit)' );
            results.push( `[INFO] ${currentCommit} ${previousCommit} ${dependencies[ this.repo ].sha}` );
          }
          if ( ( await getRepoVersion( this.repo ) ).testType === 'rc' && this.isReleased ) {
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
        const branches = await getBranches( dependency );

        if ( branches.includes( potentialReleaseBranch ) ) {
          const currentCommit = await gitRevParse( dependency, 'HEAD' );
          await gitCheckout( dependency, potentialReleaseBranch );
          await gitPull( dependency );
          const expectedCommit = await gitRevParse( dependency, 'HEAD' );

          if ( currentCommit !== expectedCommit ) {
            results.push( `[WARNING] Dependency mismatch for ${dependency} on branch ${potentialReleaseBranch}` );
          }
        }
      }

      const checkURL = async ( name, relativeURL ) => {
        try {
          await withServer( async port => {
            const url = `http://localhost:${port}/${relativeURL}`;
            const error = await puppeteerLoad( url );
            if ( error ) {
              results.push( `[WARNING] ${name} failure for ${url}: ${error}` );
            }
          } );
        }
        catch( e ) {
          results.push( `[ERROR] Failure to check ${name}` );
        }
      };

      if ( options.checkUnbuilt ) {
        await checkURL( 'Unbuilt HTML', `${this.repo}/${this.repo}_en.html?brand=phet&ea` );
      }
      if ( options.checkPhetmarks ) {
        await checkURL( 'Phetmarks', 'phetmarks/index.html' );
      }

      if ( options.build ) {
        try {
          await build( this.repo, {
            brands: this.brands
          } );
        }
        catch( e ) {
          results.push( `[ERROR] Failure to build: ${e}` );
        }
      }

      if ( options.checkBuilt ) {
        await checkURL( 'Built HTML', `${this.repo}/build/${usesChipper2 ? 'phet/' : ''}${this.repo}_en${usesChipper2 ? '_phet' : ''}.html` );
      }

      await checkoutMaster( this.repo, options.build );

      return results.map( line => `[${this.toString()}] ${line}` ); // tag with the repo name
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

      return await gitIsAncestor( 'phet-io', 'e3fc26079358d86074358a6db3ebaf1af9725632', sha );
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

      return await gitIsAncestor( 'chipper', '7375f6a57b5874b6bbf97a54c9a908f19f88d38f', sha );
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

      return await gitIsAncestor( 'phet-io-wrappers', '7ec1a04a70fb9707b381b8bcab3ad070815ef7fe', sha );
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
     * Gets a list of ReleaseBranches which would be potential candidates for a maintenance release.
     * @public
     *
     * @param {function} filterRepo - Passed {string} repo, return false if it should be excluded.
     * @returns {Promise.<Array.<ReleaseBranch>>}
     * @rejects {ExecuteError}
     */
    static async getMaintenanceBranches( filterRepo = () => true ) {
      winston.debug( 'retrieving available sim branches' );

      const simMetadataResult = await simMetadata( {
        summary: true,
        type: 'html'
      } );

      const activeSimRepos = getActiveSims();

      // Released phet branches
      const phetBranches = simMetadataResult.projects.map( simData => {
        const repo = simData.name.slice( simData.name.indexOf( '/' ) + 1 );
        const branch = `${simData.version.major}.${simData.version.minor}`;
        return new ReleaseBranch( repo, branch, [ 'phet' ], true );
      } );

      // Released phet-io branches
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

      // Unreleased branches
      const unreleasedBranches = [];
      for ( const repo of activeSimRepos.filter( filterRepo ) ) {
        // Exclude explicitly excluded repos
        if ( JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) ).phet.ignoreForAutomatedMaintenanceReleases ) {
          continue;
        }

        const branches = await getBranches( repo );

        for ( const branch of branches ) {
          // We aren't unreleased if we're included in either phet or phet-io metadata.
          // See https://github.com/phetsims/balancing-act/issues/118
          if ( phetBranches.concat( phetioBranches ).filter( releaseBranch => releaseBranch.repo === repo && releaseBranch.branch === branch ).length ) {
            continue;
          }

          const match = branch.match( /^(\d+)\.(\d+)$/ );

          if ( match ) {
            const major = parseInt( match[ 1 ], 10 );
            const minor = parseInt( match[ 2 ], 10 );

            const projectMetadata = simMetadataResult.projects.find( project => project.name === `html/${repo}` ) || null;
            const productionVersion = projectMetadata ? projectMetadata.version : null;

            if ( !productionVersion ||
                 major > productionVersion.major ||
                 ( major === productionVersion.major && minor > productionVersion.minor ) ) {

              // Do a checkout so we can determine supported brands
              await gitCheckout( repo, branch );
              const packageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) );
              const includesPhetio = packageObject.phet && packageObject.phet.supportedBrands && packageObject.phet.supportedBrands.includes( 'phet-io' );
              await gitCheckout( repo, 'master' );

              const brands = [
                'phet',
                ...( includesPhetio ? [ 'phet-io' ] : [] )
              ];

              unreleasedBranches.push( new ReleaseBranch( repo, branch, brands, false ) );
            }
          }
        }
      }

      return ReleaseBranch.combineLists( [ ...phetBranches, ...phetioBranches, ...unreleasedBranches ] ).filter( releaseBranch => {
        return filterRepo( releaseBranch.repo );
      } );
    }

    /**
     * Combines multiple matching ReleaseBranches into one where appropriate, and sorts.
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
