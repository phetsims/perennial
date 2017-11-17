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
var npmUpdate = require( './npmUpdate' );
var winston = require( 'winston' );

/**
 * TODO: doc
 * @public
 *
 * @param {string} repo - The repository name
 * @param {boolean} includeNpmUpdate - Whether npm updates should be done to repositories.
 * @param {Function} callback - callback(), called when done
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, includeNpmUpdate, callback, errorCallback ) {
  winston.info( 'checking out master for ' + repo );

  getDependencies( repo, function( dependencies ) {
    // Ignore the repo we just checked out, and the comment
    var repoNames = Object.keys( dependencies ).filter( function( key ) {
      return key !== 'comment' && key !== repo;
    } );

    // async loop until done
    function checkoutNext() {
      if ( repoNames.length ) {
        var dependencyRepoName = repoNames.shift();

        gitCheckout( dependencyRepoName, 'master', function() {
          checkoutNext();
        } );
      }
      else {
        gitCheckout( repo, 'master', function() {
          if ( includeNpmUpdate ) {
            npmUpdate( repo, function() {
              npmUpdate( 'chipper', function() {
                callback();
              }, errorCallback );
            }, errorCallback );
          }
          else {
            callback();
          }
        }, errorCallback );
      }
    }

    checkoutNext();
  }, errorCallback );
};
