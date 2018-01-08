// Copyright 2017, University of Colorado Boulder

/**
 * Checks out the given dependencies (for a given repository) without modifying the given repository.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line
const gitCheckout = require( './gitCheckout' );
const npmUpdate = require( './npmUpdate' );
const winston = require( 'winston' );

/**
 * Checks out the given dependencies (for a given repository) without modifying the given repository.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Object} dependencies - In the format of dependencies.json
 * @param {boolean} includeNpmUpdate - Whether npm update should be included (for the repo and chipper)
 * @returns {Promise.<Array.<string>>} - Resolves with checkedOutRepos
 */
module.exports = async function( repo, dependencies, includeNpmUpdate ) {
  winston.info( `checking out dependencies for ${repo}` );

  // track checked-out repositories, as it's helpful for future processes
  const checkedOutRepoNames = [ repo ];

  // Ignore the repo we just checked out, and the comment
  const repoNames = Object.keys( dependencies ).filter( key => key !== 'comment' && key !== repo );

  for ( var i = 0; i < repoNames.length; i++ ) {
    var dependencyRepoName = repoNames[ i ];

    checkedOutRepoNames.push( dependencyRepoName );
    var sha = dependencies[ dependencyRepoName ].sha;
    if ( !sha ) {
      throw new Error( `Missing sha for ${dependencyRepoName} in ${repo}` );
    }

    await gitCheckout( dependencyRepoName, sha );
  }

  if ( includeNpmUpdate ) {
    await npmUpdate( repo );
    await npmUpdate( 'chipper' );
  }

  return checkedOutRepoNames;
};
