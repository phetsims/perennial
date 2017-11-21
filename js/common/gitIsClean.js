// Copyright 2017, University of Colorado Boulder

/**
 * Checks to see if the git state/status is clean
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var winston = require( 'winston' );

/**
 * Checks to see if the git state/status is clean
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Function} callback - callback( isClean: {boolean} )
 * @param {Function} [errorCallback] - errorCallback( code: {number}, stdout: {string} )
 */
module.exports = function( repo, callback, errorCallback ) {
  winston.debug( 'git status check on ' + repo );

  execute( 'git', [ 'status', '--porcelain' ], '../' + repo, function( stdout ) {
    callback( stdout.length === 0 );
  }, errorCallback );
};
