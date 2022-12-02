// Copyright 2017, University of Colorado Boulder

/**
 * Checks out the latest deployed production release branch (and dependencies) for a repository.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const checkoutTarget = require( './checkoutTarget' );
const simMetadata = require( './simMetadata' );
const assert = require( 'assert' );
const winston = require( 'winston' );

/**
 * Checks out the latest release branch (and dependencies) for a repository.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {boolean} includeNpmUpdate
 * @returns {Promise.<Array.<string>>} - Resolves with checkedOutRepos
 */
module.exports = async function( repo, includeNpmUpdate ) {
  winston.info( `checking out release for ${repo}` );

  const data = await simMetadata( {
    simulation: repo
  } );

  assert( data.projects.length === 1, 'Metadata request should only return 1 simulation result' );

  const branch = `${data.projects[ 0 ].version.major}.${data.projects[ 0 ].version.minor}`;

  return checkoutTarget( repo, branch, includeNpmUpdate );
};
