// Copyright 2017, University of Colorado Boulder

/**
 * Whether a git commit is an ancestor of another.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var winston = require( 'winston' );

/**
 * Whether a git commit is an ancestor of another
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} possibleAncestor
 * @param {string} possibleDescendant
 * @param {Function} callback - callback( isAnAncestor: {boolean} ), called when done
 * @param {Function} [errorCallback] - callback( stdout, exitCode )
 */
module.exports = function( repo, possibleAncestor, possibleDescendant, callback, errorCallback ) {
  winston.info( 'git check (in ' + repo + ') for whether ' + possibleAncestor + ' is an ancestor of ' + possibleDescendant );

  execute( 'git', [ 'merge-base', '--is-ancestor', possibleAncestor, possibleDescendant ], '../' + repo, function() {
    callback( true );
  }, function ( exitCode, stdout ) {
    if ( exitCode === 1 ) {
      callback( false );
    }
    else {
      winston.error( 'Unexpected exit code from merge-base: ' + exitCode );
      if ( errorCallback ) {
        errorCallback( exitCode, stdout );
      }
      else {
        throw new Error( 'Unexpected exit code from merge-base: ' + exitCode );
      }
    }
  } );
};
