// Copyright 2017, University of Colorado Boulder

/**
 * Checks out master for a repository and all of its dependencies.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const getDependencies = require( './getDependencies' );
const gitCheckout = require( './gitCheckout' );
const npmUpdate = require( './npmUpdate' );
const winston = require( 'winston' );

/**
 * Checks out master for a repository and all of its dependencies.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {boolean} includeNpmUpdate - Whether npm updates should be done to repositories.
 * @returns {Promise}
 */
module.exports = async function( repo, includeNpmUpdate ) {
  winston.info( `checking out master for ${repo}` );

  const dependencies = await getDependencies( repo );

  // Ignore the comment
  const repoNames = Object.keys( dependencies ).filter( key => key !== 'comment' );

  for ( let repoName of repoNames ) { // eslint-disable-line no-restricted-syntax
    await gitCheckout( repoName, 'master' );
  }

  if ( includeNpmUpdate ) {
    await npmUpdate( repo );
    await npmUpdate( 'chipper' );
  }
};
