// Copyright 2017, University of Colorado Boulder

/**
 * Checks out master for a repository and all of its dependencies.
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
 * Checks out master for a repository and all of its dependencies.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {boolean} includeNpmUpdate - Whether npm updates should be done to repositories.
 * @returns {Promise}
 */
module.exports = async function( repo, includeNpmUpdate ) {
  winston.info( 'checking out master for ' + repo );

  var dependencies = await getDependencies( repo );

  // Ignore the comment
  var repoNames = Object.keys( dependencies ).filter( function( key ) {
    return key !== 'comment';
  } );

  // TODO: can we use each here safely?
  for ( var i = 0; i < repoNames.length; i++ ) {
    await gitCheckout( repoNames[ i ], 'master' );
  }

  if ( includeNpmUpdate ) {
    await npmUpdate( repo );
    await npmUpdate( 'chipper' );
  }
};
