// Copyright 2018, University of Colorado Boulder

/**
 * The main persistent state-bearing object for maintenance releases. Can be loaded from or saved to a dedicated file.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

/* eslint-env browser, node */
'use strict';

const assert = require( 'assert' );
const fs = require( 'fs' );
const ModifiedReleaseBranch = require( './ModifiedReleaseBranch' );
const Patch = require( './Patch' );
const ReleaseBranch = require( './ReleaseBranch' );
// const winston = require( 'winston' );

module.exports = ( function() {

  class Maintenance {
    /**
     * @public
     * @constructor
     *
     * @param {Array.<Patch>} patches
     * @param {Array.<ModifiedReleaseBranch>} branches
     */
    constructor( patches = [], branches = [] ) {
      assert( Array.isArray( patches ) && patches.forEach( patch => assert( patch instanceof Patch ) ) );
      assert( Array.isArray( branches ) && branches.forEach( branch => assert( branch instanceof ModifiedReleaseBranch ) ) );

      // @public {Array.<Patch>}
      this.patches = patches;

      // @public {Array.<ModifiedReleaseBranch>}
      this.branches = branches;
    }

    /**
     * Convert into a plain JS object meant for JSON serialization.
     * @public
     *
     * @returns {Object}
     */
    serialize() {
      return {
        patches: this.patches.map( patch => patch.serialize() ),
        branches: this.branches.map( branch => branch.serialize() )
      };
    }

    /**
     * Takes a serialized form of the Maintenance and returns an actual instance.
     * @public
     *
     * @param {Object}
     * @returns {Maintenance}
     */
    static deserialize( { patches, branches } ) {
      // Pass in patch references to branch deserialization
      const deserializedPatches = patches.map( Patch.deserialize );
      return new Maintenance( patches, branches.map( branch => ModifiedReleaseBranch.deserialize( branch, deserializedPatches ) ) );
    }

    save() {
      return fs.writeFileSync( '.maintenance.json', JSON.stringify( this.serialize(), null, 2 ) );
    }

    static load() {
      return Maintenance.deserialize( JSON.parse( fs.readFileSync( '.maintenance.json', 'utf8' ) ) );
    }

    /**
     * Runs a number of checks through every release branch.
     * @public
     *
     * @returns {Promise}
     */
    static async checkBranchStatus() {
      const branches = await ReleaseBranch.getMaintenanceBranches();
      let results = [];

      for ( let branch of branches ) {
        console.log( `Checking ${branch.repo} ${branch.branch}` );
        ( await branch.getStatus() ).forEach( console.log );
      }
    }
  }

  return Maintenance;
} )();
