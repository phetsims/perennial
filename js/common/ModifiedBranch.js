// Copyright 2018, University of Colorado Boulder

/**
 * Represents a modified simulation release branch, with either pending or applied (and not published) changes.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

/* eslint-env browser, node */
'use strict';

const assert = require( 'assert' );
const checkoutDependencies = require( './checkoutDependencies' );
const getDependencies = require( './getDependencies' );
const gitCheckout = require( './gitCheckout' );
const gitPull = require( './gitPull' );
const Patch = require( './Patch' );
const ReleaseBranch = require( './ReleaseBranch' );
const SimVersion = require( './SimVersion' );

module.exports = ( function() {

  class ModifiedBranch {
    /**
     * @public
     * @constructor
     *
     * @param {ReleaseBranch} releaseBranch
     * @param {Object} [changedDependencies]
     * @param {Array.<Patch>} [neededPatches]
     * @param {Array.<string>} [messages]
     * @param {SimVersion|null} [deployedVersion]
     */
    constructor( releaseBranch, changedDependencies = {}, neededPatches = [], messages = [], deployedVersion = null ) {
      assert( releaseBranch instanceof ReleaseBranch );
      assert( typeof changedDependencies === 'object' );
      assert( Array.isArray( neededPatches ) );
      neededPatches.forEach( patch => assert( patch instanceof Patch ) );
      assert( Array.isArray( messages ) );
      messages.forEach( message => assert( typeof message === 'string' ) );
      assert( deployedVersion === null || deployedVersion instanceof SimVersion );

      // @public {ReleaseBranch}
      this.releaseBranch = releaseBranch;

      // @public {Object} - Keys are repo names, values are SHAs
      this.changedDependencies = changedDependencies;

      // @public {Array.<Patch>}
      this.neededPatches = neededPatches;

      // @public {Array.<string>} - Messages from already-applied patches or other changes
      this.messages = messages;

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
        neededPatches: this.neededPatches.map( patch => patch.repo ),
        messages: this.messages,
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
    static deserialize( { releaseBranch, changedDependencies, neededPatches, messages, deployedVersion }, patches ) {
      return new ModifiedBranch(
        ReleaseBranch.deserialize( releaseBranch ),
        changedDependencies,
        neededPatches.map( repo => patches.find( patch => patch.repo === repo ) ),
        messages,
        deployedVersion || null
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
             this.messages.length === 0;
    }

    /**
     * Whether it is safe to deploy a release candidate for this branch.
     * @public
     *
     * @returns {boolean}
     */
    get isReadyForReleaseCandidate() {
      return this.neededPatches.length === 0 &&
             this.messages.length > 0 &&
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
             this.messages.length > 0 &&
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

    async checkout( includeNpmUpdate = true ) {
      await gitCheckout( this.repo, this.branch );
      await gitPull( this.repo );
      const dependencies = await getDependencies( this.repo );
      for ( let key of Object.keys( this.changedDependencies ) ) {
        // This should exist hopefully
        dependencies[ key ].sha = this.changedDependencies[ key ];
      }
      return await checkoutDependencies( this.repo, dependencies, includeNpmUpdate );
    }
  }

  return ModifiedBranch;
} )();
