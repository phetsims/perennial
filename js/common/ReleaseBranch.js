// Copyright 2018, University of Colorado Boulder

/**
 * Represents a simulation release branch for deployment
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

/* eslint-env browser, node */
'use strict';

const assert = require( 'assert' );
const fs = require( 'fs' );
const checkoutMaster = require( './checkoutMaster' );
const checkoutTarget = require( './checkoutTarget' );
const getBranches = require( './getBranches' );
const getDependencies = require( './getDependencies' );
const gitCheckout = require( './gitCheckout' );
const gitRevParse = require( './gitRevParse' );
const simMetadata = require( './simMetadata' );
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
     */
    constructor( repo, branch, brands ) {
      assert( typeof repo === 'string' );
      assert( typeof branch === 'string' );
      assert( Array.isArray( brands ) );

      // @public {string}
      this.repo = repo;
      this.branch = branch;

      // @public {Array.<string>}
      this.brands = brands;
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
        brands: this.brands
      };
    }

    /**
     * Takes a serialized form of the ReleaseBranch and returns an actual instance.
     * @public
     *
     * @param {Object}
     * @returns {ReleaseBranch}
     */
    static deserialize( { repo, branch, brands } ) {
      return new ReleaseBranch( repo, branch, brands );
    }

    /**
     * Returns a list of status messages of anything out-of-the-ordinary
     * @public
     *
     * @returns {Promise.<Array.<string>>}
     */
    async getStatus() {
      // TODO: gitIsClean before any of these are run for status
      const results = [];

      await checkoutTarget( this.repo, this.branch, false ); // don't npm update

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
            results.push( 'Potential changes (dependency is not previous commit)' );
            results.push( currentCommit + ' ' + previousCommit + ' ' + dependencies[ this.repo ].sha );
          }
        }
        catch ( e ) {
          results.push( `Failure to check current/previous commit: ${e.message}` );
        }
      }
      else {
        results.push( 'Own repository not included in dependencies' );
      }

      for ( let dependency of dependencyNames ) {
        const potentialReleaseBranch = `${this.repo}-${this.branch}`;
        const branches = await getBranches( dependency );

        if ( branches.includes( potentialReleaseBranch ) ) {
          const currentCommit = await gitRevParse( dependency, 'HEAD' );
          await gitCheckout( dependency, potentialReleaseBranch );
          const expectedCommit = await gitRevParse( dependency, 'HEAD' );

          if ( currentCommit !== expectedCommit ) {
            results.push( `Dependency mismatch for ${dependency} on branch ${potentialReleaseBranch}` );
          }
        }
      }

      await checkoutMaster( this.repo, false ); // don't npm update

      return results.map( line => `[${this.repo} ${this.branch}] ${line}` ); // tag with the repo name
    }

    /**
     * Gets a list of ReleaseBranches which would be potential candidates for a maintenance release.
     * @public
     *
     * @returns {Promise.<Array.<ReleaseBranch>>}
     * @rejects {ExecuteError}
     */
    static async getMaintenanceBranches() {
      winston.debug( 'retrieving available sim branches' );

      const phetioBranchesJSON = JSON.parse( fs.readFileSync( '../perennial/data/phet-io-maintenance.json', 'utf8' ) );
      const phetioBranches = phetioBranchesJSON.simBranches.map( ReleaseBranch.deserialize );

      const phetBranches = ( await simMetadata( {
        summary: true,
        type: 'html'
      } ) ).projects.map( simData => {
        let repo = simData.name.slice( simData.name.indexOf( '/' ) + 1 );
        let branch = simData.version.major + '.' + simData.version.minor;
        return new ReleaseBranch( repo, branch, [ 'phet' ] );
      } );

      return ReleaseBranch.combineLists( [ ...phetBranches, ...phetioBranches ] );
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

      for ( let simBranch of simBranches ) {
        let foundBranch = false;
        for ( let resultBranch of resultBranches ) {
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
