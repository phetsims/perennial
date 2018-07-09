// Copyright 2018, University of Colorado Boulder

/**
 * Represents a simulation release branch for deployment
 */

/* eslint-env browser, node */
'use strict';

const assert = require( 'assert' );

module.exports = ( function() {

  /**
   * @public
   * @constructor
   *
   * @param {string} repo
   * @param {string} branch
   * @param {Array.<string>} brands
   */
  function SimBranch( repo, branch, brands ) {
    assert( typeof repo === 'string' );
    assert( typeof branch === 'string' );
    assert( Array.isArray( brands ) );

    // @public {string}
    this.repo = repo;
    this.branch = branch;

    // @public {Array.<string>}
    this.brands = brands;
  }

  // Can't rely on inherit existing
  SimBranch.prototype = {
    constructor: SimBranch
  };

  /**
   * Combines multiple matching SimBranches into one where appropriate, and sorts.
   * @public
   *
   * @param {Array.<SimBranch>} simBranches
   * @returns {Array.<SimBranch>}
   */
  SimBranch.combineLists = function( simBranches ) {
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
  };

  return SimBranch;
} )();
