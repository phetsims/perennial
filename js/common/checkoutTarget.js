// Copyright 2017, University of Colorado Boulder

/**
 * TODO doc
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var checkoutDependencies = require( './checkoutDependencies' );
var getDependencies = require( './getDependencies' );
var gitCheckout = require( './gitCheckout' );
var gitPull = require( './gitPull' );
var winston = require( 'winston' );
var _ = require( 'lodash' ); // eslint-disable-line

/**
 * TODO: doc
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - branch or SHA
 * @param {boolean} includeNpmUpdate
 * @param {Function} callback - callback( checkedOutRepos: {Array.<string>} ), called when done
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, target, includeNpmUpdate, callback, errorCallback ) {
  winston.info( 'checking out shas for ' + repo + ' ' + target );

  gitCheckout( repo, target, function() {
    gitPull( repo, function() {
      getDependencies( repo, function( dependencies ) {
        checkoutDependencies( repo, dependencies, includeNpmUpdate, callback, errorCallback );
      }, errorCallback );
    }, errorCallback );
  }, errorCallback );
};
