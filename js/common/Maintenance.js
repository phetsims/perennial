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
const ModifiedBranch = require( './ModifiedBranch' );
const Patch = require( './Patch' );
const ReleaseBranch = require( './ReleaseBranch' );
// const winston = require( 'winston' );

const MAINTENANCE_FILE = '.maintenance.json';

module.exports = ( function() {

  class Maintenance {
    /**
     * @public
     * @constructor
     *
     * @param {Array.<Patch>} [patches]
     * @param {Array.<ModifiedBranch>} [modifiedBranches]
     */
    constructor( patches = [], modifiedBranches = [] ) {
      assert( Array.isArray( patches ) );
      patches.forEach( patch => assert( patch instanceof Patch ) );
      assert( Array.isArray( modifiedBranches ) );
      modifiedBranches.forEach( branch => assert( branch instanceof ModifiedBranch ) );

      // @public {Array.<Patch>}
      this.patches = patches;

      // @public {Array.<ModifiedBranch>}
      this.modifiedBranches = modifiedBranches;
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
        modifiedBranches: this.modifiedBranches.map( modifiedBranch => modifiedBranch.serialize() )
      };
    }

    /**
     * Takes a serialized form of the Maintenance and returns an actual instance.
     * @public
     *
     * @param {Object}
     * @returns {Maintenance}
     */
    static deserialize( { patches, modifiedBranches } ) {
      // Pass in patch references to branch deserialization
      const deserializedPatches = patches.map( Patch.deserialize );
      return new Maintenance( deserializedPatches, modifiedBranches.map( modifiedBranch => ModifiedBranch.deserialize( modifiedBranch, deserializedPatches ) ) );
    }

    /**
     * Saves the state of this object into the maintenance file.
     * @public
     */
    save() {
      return fs.writeFileSync( MAINTENANCE_FILE, JSON.stringify( this.serialize(), null, 2 ) );
    }

    /**
     * Loads a new Maintenance object (if possible) from the maintenance file.
     * @public
     *
     * @returns {Maintenance}
     */
    static load() {
      if ( fs.existsSync( MAINTENANCE_FILE ) ) {
        return Maintenance.deserialize( JSON.parse( fs.readFileSync( MAINTENANCE_FILE, 'utf8' ) ) );
      }
      else {
        return new Maintenance();
      }
    }

    /**
     * Resets all state.
     * @public
     */
    static reset() {
      new Maintenance().save();
    }



    /**
     * Looks up a patch by its repository.
     * @public
     *
     * @param {string} repo
     * @returns {Patch}
     */
    findPatch( repo ) {
      const patch = this.patches.find( p => p.repo === repo );
      assert( patch, `Patch not found for ${repo}` );

      return patch;
    }

    /**
     * Looks up (or adds) a ModifiedBranch by its identifying information.
     * @public
     *
     * @param {string} repo
     * @param {string} branch
     * @returns {Promise.<ModifiedBranch>}
     */
    async ensureModifiedBranch( repo, branch ) {
      let modifiedBranch = this.modifiedBranches.find( branch => branch.releaseBranch.repo === repo && branch.releaseBranch.branch === branch );

      if ( !modifiedBranch ) {
        const releaseBranches = await ReleaseBranch.getMaintenanceBranches();
        const releaseBranch = releaseBranches.find( release => release.repo === repo && release.branch === branch );
        assert( releaseBranch, `Could not find a release branch for repo=${repo} branch=${branch}` );

        modifiedBranch = new ModifiedBranch( releaseBranch );

        // If we are creating it, add it to our list.
        this.modifiedBranches.push( modifiedBranch );
      }

      return modifiedBranch;
    }

    /**
     * Attempts to remove a modified branch (if it doesn't need to be kept around).
     * @public
     *
     * @param {ModifiedBranch} modifiedBranch
     */
    tryRemovingModifiedBranch( modifiedBranch ) {
      if ( modifiedBranch.isUnused ) {
        const index = this.branches.indexOf( modifiedBranch );
        assert( index >= 0 );

        this.branches.splice( index, 1 );
      }
    }




    /**
     * Runs a number of checks through every release branch.
     * @public
     *
     * @returns {Promise}
     */
    static async checkBranchStatus() {
      const releaseBranches = await ReleaseBranch.getMaintenanceBranches();

      for ( let releaseBranch of releaseBranches ) {
        console.log( `Checking ${releaseBranch.repo} ${releaseBranch.branch}` );
        ( await releaseBranch.getStatus() ).forEach( console.log );
      }
    }

    /**
     * Displays a listing of the current maintenance status.
     * @public
     *
     * @returns {Promise}
     */
    static async list() {
      console.log( 'Maintenance Status' );

      const maintenance = Maintenance.load();

      for ( let modifiedBranch of maintenance.modifiedBranches ) {
        console.log( `${modifiedBranch.repo} ${modifiedBranch.branch} ${modifiedBranch.brands.join( ',' )}` );
        if ( Object.keys( modifiedBranch.changedDependencies ).length > 0 ) {
          console.log( `Deps: ${JSON.stringify( modifiedBranch.changedDependencies, null, 2 )}` );
        }
        if ( modifiedBranch.neededPatches.length ) {
          console.log( `Needed patches: ${modifiedBranch.neededPatches.map( patch => patch.repo ).join( ',' )}` );
        }
        if ( modifiedBranch.messages.length ) {
          console.log( `Messages: ${modifiedBranch.messages.join( ' and ' )}` );
        }
      }

      for ( let patch of maintenance.patches ) {
        console.log( `[${patch.repo}] ${patch.message}` );
        for ( let sha of patch.shas ) {
          console.log( `  ${sha}` );
        }
        for ( let modifiedBranch of maintenance.modifiedBranches ) {
          if ( modifiedBranch.neededPatches.includes( patch ) ) {
            console.log( `    ${modifiedBranch.repo} ${modifiedBranch.branch} ${modifiedBranch.brands.join( ',' )}` );
          }
        }
      }
    }

    /**
     * Creates a patch
     * @public
     *
     * @param {string} repo
     * @param {string} message
     * @returns {Promise}
     */
    static async createPatch( repo, message ) {
      const maintenance = Maintenance.load();

      for ( let patch of maintenance.patches ) {
        if ( patch.repo === repo ) {
          throw new Error( 'Multiple patches with the same repo are not concurrently supported' );
        }
      }

      maintenance.patches.push( new Patch( repo, message ) );

      maintenance.save();
    }

    /**
     * Removes a patch
     * @public
     *
     * @param {string} repo
     * @returns {Promise}
     */
    static async removePatch( repo ) {
      const maintenance = Maintenance.load();

      const patch = maintenance.findPatch( repo );

      for ( let branch of maintenance.modifiedBranches ) {
        if ( branch.neededPatches.includes( patch ) ) {
          throw new Error( 'Patch is marked as needed by at least one branch' );
        }
      }

      maintenance.patches.splice( maintenance.patches.indexOf( patch ), 1 );

      maintenance.save();
    }

    /**
     * Adds a particular SHA (to cherry-pick) to a patch.
     * @public
     *
     * @param {string} repo
     * @param {string} sha
     * @returns {Promise}
     */
    static async addPatchSHA( repo, sha ) {
      const maintenance = Maintenance.load();

      const patch = maintenance.findPatch( repo );

      patch.shas.push( sha );

      maintenance.save();
    }

    /**
     * Removes a particular SHA (to cherry-pick) from a patch.
     * @public
     *
     * @param {string} repo
     * @param {string} sha
     * @returns {Promise}
     */
    static async removePatchSHA( repo, sha ) {
      const maintenance = Maintenance.load();

      const patch = maintenance.findPatch( repo );

      const index = patch.shas.indexOf( sha );
      assert( index >= 0, 'SHA not found' );

      patch.shas.splice( index, 1 );

      maintenance.save();
    }

    /**
     * Adds a needed patch to a given modified branch.
     * @public
     *
     * @param {string} repo
     * @param {string} branch
     * @param {string} patchRepo
     */
    static async addNeededPatch( repo, branch, patchRepo ) {
      const maintenance = Maintenance.load();

      const patch = maintenance.findPatch( patchRepo );

      const modifiedBranch = await maintenance.ensureModifiedBranch( repo, branch );
      modifiedBranch.neededPatches.push( patch );

      maintenance.save();
    }

    /**
     * Adds a needed patch to whatever subset of release branches match the filter.
     * @public
     *
     * @param {string} patchRepo
     * @param {function} filter - function( ReleaseBranch ): Promise.<boolean>
     */
    static async addNeededPatches( patchRepo, filter ) {
      const maintenance = Maintenance.load();

      const patch = maintenance.findPatch( patchRepo );
      const releaseBranches = await ReleaseBranch.getMaintenanceBranches();

      for ( let releaseBranch of releaseBranches ) {
        if ( !( await filter( releaseBranch ) ) ) {
          continue;
        }

        const modifiedBranch = await maintenance.ensureModifiedBranch( releaseBranch.repo, releaseBranch.branch );
        if ( !modifiedBranch.neededPatches.includes( patch ) ) {
          modifiedBranch.neededPatches.push( patch );
        }
      }

      maintenance.save();
    }

    /**
     * Adds a needed patch to all release branches.
     * @public
     *
     * @param {string} patchRepo
     */
    static async addAllNeededPatches( patchRepo ) {
      Maintenance.addNeededPatches( patchRepo, async () => true );
    }

    /**
     * Adds a needed patch to all release branches that do NOT include the given commit on the repo
     * @public
     *
     * @param {string} patchRepo
     * @param {string} sha
     */
    static async addNeededPatchesBefore( patchRepo, sha ) {
      Maintenance.addNeededPatches( patchRepo, async ( releaseBranch ) => {
        return await releaseBranch.missingSHA( patchRepo, sha );
      } );
    }

    /**
     * Adds a needed patch to all release branches that DO include the given commit on the repo
     * @public
     *
     * @param {string} patchRepo
     * @param {string} sha
     */
    static async addNeededPatchesAfter( patchRepo, sha ) {
      Maintenance.addNeededPatches( patchRepo, async ( releaseBranch ) => {
        return await releaseBranch.includesSHA( patchRepo, sha );
      } );
    }

    /**
     * Removes a needed patch from a given modified branch.
     * @public
     *
     * @param {string} repo
     * @param {string} branch
     * @param {string} patchRepo
     */
    static async removeNeededPatch( repo, branch, patchRepo ) {
      const maintenance = Maintenance.load();

      const patch = maintenance.findPatch( patchRepo );

      const modifiedBranch = await maintenance.ensureModifiedBranch( repo, branch );
      const index = modifiedBranch.neededPatches.indexOf( patch );
      assert( index >= 0, 'Could not find needed patch on the modified branch' );

      modifiedBranch.neededPatches.splice( index, 1 );
      maintenance.tryRemovingModifiedBranch( modifiedBranch );

      maintenance.save();
    }

    /**
     * Removes a needed patch from whatever subset of (current) release branches match the filter.
     * @public
     *
     * @param {string} patchRepo
     * @param {function} filter - function( ReleaseBranch ): Promise.<boolean>
     */
    static async removeNeededPatches( patchRepo, filter ) {
      const maintenance = Maintenance.load();

      const patch = maintenance.findPatch( patchRepo );

      for ( let modifiedBranch of maintenance.modifiedBranches ) {
        if ( !( await filter( modifiedBranch.releaseBranch ) ) ) {
          continue;
        }

        const index = modifiedBranch.neededPatches.indexOf( patch );
        assert( index >= 0, 'Could not find needed patch on the modified branch' );

        modifiedBranch.neededPatches.splice( index, 1 );
        maintenance.tryRemovingModifiedBranch( modifiedBranch );
      }

      maintenance.save();
    }

    /**
     * Removes a needed patch from all release branches that do NOT include the given commit on the repo
     * @public
     *
     * @param {string} patchRepo
     * @param {string} sha
     */
    static async removeNeededPatchesBefore( patchRepo, sha ) {
      Maintenance.removeNeededPatches( patchRepo, async ( releaseBranch ) => {
        return await releaseBranch.missingSHA( patchRepo, sha );
      } );
    }

    /**
     * Removes a needed patch from all release branches that DO include the given commit on the repo
     * @public
     *
     * @param {string} patchRepo
     * @param {string} sha
     */
    static async removeNeededPatchesAfter( patchRepo, sha ) {
      Maintenance.removeNeededPatches( patchRepo, async ( releaseBranch ) => {
        return await releaseBranch.includesSHA( patchRepo, sha );
      } );
    }
  }

  return Maintenance;
} )();
