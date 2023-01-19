// Copyright 2018, University of Colorado Boulder

/**
 * Represents a modified simulation release branch, with either pending or applied (and not published) changes.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const Patch = require( './Patch' );
const ReleaseBranch = require( './ReleaseBranch' );
const SimVersion = require( './SimVersion' );
const checkoutDependencies = require( './checkoutDependencies' );
const getDependencies = require( './getDependencies' );
const gitCheckout = require( './gitCheckout' );
const gitPull = require( './gitPull' );
const githubCreateIssue = require( './githubCreateIssue' );
const assert = require( 'assert' );

module.exports = ( function() {

  class ModifiedBranch {
    /**
     * @public
     * @constructor
     *
     * @param {ReleaseBranch} releaseBranch
     * @param {Object} [changedDependencies]
     * @param {Array.<Patch>} [neededPatches]
     * @param {Array.<string>} [pendingMessages]
     * @param {Array.<string>} [pushedMessages]
     * @param {SimVersion|null} [deployedVersion]
     */
    constructor( releaseBranch, changedDependencies = {}, neededPatches = [], pendingMessages = [], pushedMessages = [], deployedVersion = null ) {
      assert( releaseBranch instanceof ReleaseBranch );
      assert( typeof changedDependencies === 'object' );
      assert( Array.isArray( neededPatches ) );
      neededPatches.forEach( patch => assert( patch instanceof Patch ) );
      assert( Array.isArray( pushedMessages ) );
      pushedMessages.forEach( message => assert( typeof message === 'string' ) );
      assert( deployedVersion === null || deployedVersion instanceof SimVersion );

      // @public {ReleaseBranch}
      this.releaseBranch = releaseBranch;

      // @public {Object} - Keys are repo names, values are SHAs
      this.changedDependencies = changedDependencies;

      // @public {Array.<Patch>}
      this.neededPatches = neededPatches;

      // @public {Array.<string>} - Messages from already-applied patches or other changes NOT included in dependencies.json yet
      this.pendingMessages = pendingMessages;

      // @public {Array.<string>} - Messages from already-applied patches or other changes that have been included in dependencies.json
      this.pushedMessages = pushedMessages;

      // @public {string}
      this.repo = releaseBranch.repo;
      this.branch = releaseBranch.branch;

      // @public {Array.<string>}
      this.brands = releaseBranch.brands;

      // @public {SimVersion|null} - The deployed version for the latest patches applied. Will be reset to null when
      // updates are made.
      this.deployedVersion = deployedVersion;
    }

    /**
     * Convert into a plain JS object meant for JSON serialization.
     * @public
     *
     * @returns {Object}
     */
    serialize() {
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
     * @public
     *
     * @param {Object}
     * @param {Array.<Patch>} - We only want to store patches in one location, so don't fully save the info.
     * @returns {ModifiedBranch}
     */
    static deserialize( { releaseBranch, changedDependencies, neededPatches, pendingMessages, pushedMessages, deployedVersion }, patches ) {
      return new ModifiedBranch(
        ReleaseBranch.deserialize( releaseBranch ),
        changedDependencies,
        neededPatches.map( name => patches.find( patch => patch.name === name ) ),
        pendingMessages,
        pushedMessages,
        deployedVersion ? SimVersion.deserialize( deployedVersion ) : null
      );
    }

    /**
     * Whether there is no need to keep a reference to us.
     * @public
     *
     * @returns {boolean}
     */
    get isUnused() {
      return this.neededPatches.length === 0 &&
             Object.keys( this.changedDependencies ).length === 0 &&
             this.pushedMessages.length === 0 &&
             this.pendingMessages.length === 0;
    }

    /**
     * Whether it is safe to deploy a release candidate for this branch.
     * @public
     *
     * @returns {boolean}
     */
    get isReadyForReleaseCandidate() {
      return this.neededPatches.length === 0 &&
             this.pushedMessages.length > 0 &&
             this.deployedVersion === null;
    }

    /**
     * Whether it is safe to deploy a production version for this branch.
     * @public
     *
     * @returns {boolean}
     */
    get isReadyForProduction() {
      return this.neededPatches.length === 0 &&
             this.pushedMessages.length > 0 &&
             this.deployedVersion !== null &&
             this.deployedVersion.testType === 'rc';
    }

    /**
     * Returns the branch name that should be used in dependency repositories.
     * @public
     *
     * @returns {string}
     */
    get dependencyBranch() {
      return `${this.repo}-${this.branch}`;
    }

    /**
     * Creates an issue to note that un-tested changes were patched into a branch, and should at some point be tested.
     * @public
     *
     * @param {string} [additionalNotes]
     */
    async createUnreleasedIssue( additionalNotes = '' ) {
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
     * @public
     *
     * @param {boolean} [includeMessages]
     * @returns {Promise.<Array.<string>>}
     */
    async getDeployedLinkLines( includeMessages = true ) {
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
          linkSuffixes.push( `](https://phet-dev.colorado.edu/html/${this.repo}/${versionString}${phetFolder}/${this.repo}_en${phetSuffix}.html)` );
        }
        if ( this.brands.includes( 'phet-io' ) ) {
          linkSuffixes.push( ` phet-io](https://phet-dev.colorado.edu/html/${this.repo}/${phetioDevVersion}${phetioFolder}/${this.repo}${phetioSuffix}.html?${standaloneParams})` );
          linkSuffixes.push( ` phet-io ${studioNameBeautified}](https://phet-dev.colorado.edu/html/${this.repo}/${phetioDevVersion}${phetioFolder}/wrappers/${studioName}${studioPathSuffix})` );
        }
      }
      else {
        if ( this.brands.includes( 'phet' ) ) {
          linkSuffixes.push( `](https://phet.colorado.edu/sims/html/${this.repo}/${versionString}/${this.repo}_en.html)` );
        }
        if ( this.brands.includes( 'phet-io' ) ) {
          linkSuffixes.push( ` phet-io](https://phet-io.colorado.edu/sims/${this.repo}/${versionString}${phetioBrandSuffix}/${this.repo}${phetioSuffix}.html?${standaloneParams})` );
          linkSuffixes.push( ` phet-io ${studioNameBeautified}](https://phet-io.colorado.edu/sims/${this.repo}/${versionString}${phetioBrandSuffix}/wrappers/${studioName}${studioPathSuffix})` );
        }
      }

      const results = linkSuffixes.map( link => `- [ ] [${this.repo} ${versionString}${link}` );
      if ( includeMessages ) {
        results.unshift( `\n${this.repo} ${this.branch} (${this.pushedMessages.join( ', ' )})\n` );
      }
      return results;
    }

    /**
     * Checks out the modified branch.
     * @public
     *
     * @param {boolean} [includeNpmUpdate]
     * @returns {Promise.<Array.<string>>} - Names of checked out repositories
     */
    async checkout( includeNpmUpdate = true ) {
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

  return ModifiedBranch;
} )();
