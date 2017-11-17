// Copyright 2017, University of Colorado Boulder

/**
 * Checks out the latest release branch (and dependencies) for a repository.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var checkoutTarget = require( './checkoutTarget' );
var simMetadata = require( './simMetadata' );
var winston = require( 'winston' );

/**
 * Checks out the latest release branch (and dependencies) for a repository.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {boolean} includeNpmUpdate
 * @param {Function} callback - callback( checkedOutRepos: {Array.<string>} ), called when done
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} ), called when errors with the
 *                                     exit code of the process.
 */
module.exports = function( repo, includeNpmUpdate, callback, errorCallback ) {
  winston.info( 'checking out release for ' + repo );
  if ( typeof callback !== 'function' ) {
    throw new Error();
  }

  simMetadata( {
    summary: true,
    simulation: repo
  }, function( data ) {
    if ( data.projects.length !== 1 ) {
      throw new Error( 'Bad version lookup!' );
    }

    var branch = data.projects[ 0 ].version.major + '.' + data.projects[ 0 ].version.minor;

    checkoutTarget( repo, branch, includeNpmUpdate, callback, errorCallback );
  } );
};
