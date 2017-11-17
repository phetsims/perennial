// Copyright 2017, University of Colorado Boulder

/**
 * Checks out the given dependencies (for a given repository) without modifying the given repository.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var gitCheckout = require( './gitCheckout' );
var npmUpdate = require( './npmUpdate' );
var winston = require( 'winston' );
var _ = require( 'lodash' ); // eslint-disable-line

/**
 * Checks out the given dependencies (for a given repository) without modifying the given repository.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Object} dependencies - In the format of dependencies.json
 * @param {boolean} includeNpmUpdate - Whether npm update should be included (for the repo and chipper)
 * @param {Function} callback - callback( checkedOutRepos: {Array.<string>} ), called when done
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, dependencies, includeNpmUpdate, callback, errorCallback ) {
  winston.info( 'checking out dependencies for ' + repo );

  // track checked-out repositories, as it's helpful for future processes
  var checkedOutRepoNames = [ repo ];

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
      if ( !sha ) {
        throw new Error( 'Missing sha for ' + dependencyRepoName + ' in ' + repo );
      }

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
};
