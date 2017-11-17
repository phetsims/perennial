// Copyright 2017, University of Colorado Boulder

/**
 * TODO doc
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var getDependencies = require( './getDependencies' );
var gitCheckout = require( './gitCheckout' );
var gitPull = require( './gitPull' );
var npmUpdate = require( './npmUpdate' );
var winston = require( 'winston' );

/**
 * TODO: doc
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - branch or SHA
 * @param {boolean} includeNpmUpdate - Whether npm updates should be done to repositories.
 * @param {Function} callback - callback( checkedOutRepos: {Array.<string>} ), called when done
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, target, includeNpmUpdate, callback, errorCallback ) {
  winston.info( 'checking out shas for ' + repo + ' ' + target );

  // track checked-out repositories, as it's helpful for future processes
  var checkedOutRepoNames = [ repo ];

  gitCheckout( repo, target, function() {
    gitPull( repo, function() {
      getDependencies( repo, function( dependencies ) {
        // Ignore the repo we just checked out, and the comment
        var repoNames = Object.keys( dependencies ).filter( function( key ) {
          return key !== 'comment' && key !== repo;
        } );

        // async loop until done
        function checkoutNext() {
          if ( repoNames.length ) {
            var dependencyRepoName = repoNames.shift();

            checkedOutRepoNames.push( dependencyRepoName );
            var sha = dependencies[ dependencyRepoName ].sha;
            assert( sha, 'Missing sha for ' + dependencyRepoName + ' in ' + repo );

            gitCheckout( dependencyRepoName, sha, function() {
              checkoutNext();
            } );
          }
          else {
            if ( includeNpmUpdate ) {
              npmUpdate( repo, function() {
                npmUpdate( 'chipper', function() {
                  callback( checkedOutRepoNames );
                }, errorCallback );
              }, errorCallback );
            }
            else {
              callback( checkedOutRepoNames );
            }
          }
        }

        checkoutNext();
      }, errorCallback );
    }, errorCallback );
  }, errorCallback );
};
