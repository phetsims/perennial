// Copyright 2017, University of Colorado Boulder

/**
 * Given a repository and a SHA, it checks all live HTML sims to see whether they include the SHA in their release
 * branch or not.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line
const getDependencies = require( '../common/getDependencies' );
const gitCheckout = require( '../common/gitCheckout' );
const gitIsAncestor = require( '../common/gitIsAncestor' );
const simMetadata = require( '../common/simMetadata' );

/**
 * @param {Function} doneCallback - Called with no arguments when the task is done. Our error/success functions will
 *                                  call this.
 */
module.exports = function( doneCallback ) {
  return {
    /**
     * Will print out information about with simulations include the given SHA, and which ones don't.
     * @public
     *
     * @param {string} repo
     * @param {string} sha
     */
    check( repo, sha ) {
      simMetadata( {
        summary: true
      }, function( data ) {
        const sims = data.projects.map( function( simData ) {
          return {
            name: simData.name.slice( simData.name.indexOf( '/' ) + 1 ),
            branch: simData.version.major + '.' + simData.version.minor
          };
        } );

        const includedSims = [];
        const excludedSims = [];

        function nextSim() {
          if ( sims.length ) {
            var sim = sims.shift();
            console.log( 'checking ' + sim.name );

            gitCheckout( sim.name, sim.branch, function() {
              getDependencies( sim.name, function( dependencies ) {
                var repoSHA = dependencies[ repo ].sha;
                gitIsAncestor( repo, sha, repoSHA, function( isAncestor ) {
                  ( isAncestor ? includedSims : excludedSims ).push( sim );
                  gitCheckout( sim.name, 'master', function() {
                    nextSim();
                  } );
                } );
              } );
            } );
          }
          else {
            console.log( '\nSims that include the commit in their tree: ' );
            console.log( includedSims.map( function( sim ) { return sim.name; } ).join( '\n' ) );
            console.log( '\nSims that do NOT include the commit in their tree: ' );
            console.log( excludedSims.map( function( sim ) { return sim.name; } ).join( '\n' ) );
            doneCallback();
          }
        }
        nextSim();
      } );
    }
  };
};