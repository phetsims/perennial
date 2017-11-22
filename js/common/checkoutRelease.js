// Copyright 2017, University of Colorado Boulder

/**
 * Checks out the latest release branch (and dependencies) for a repository.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const assert = require( 'assert' );
const checkoutTarget = require( './checkoutTarget' );
const simMetadata = require( './simMetadata' );
const winston = require( 'winston' );

/**
 * Checks out the latest release branch (and dependencies) for a repository.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {boolean} includeNpmUpdate
 * @returns {Promise} - Resolves with checkedOutRepos: {Array.<string>}
 */
module.exports = async function( repo, includeNpmUpdate, callback, errorCallback ) {
  winston.info( 'checking out release for ' + repo );

  const data = await simMetadata( {
    summary: true,
    simulation: repo
  } );

  assert( data.projects.length === 1, 'Metadata request should only return 1 simulation result' );

  const branch = data.projects[ 0 ].version.major + '.' + data.projects[ 0 ].version.minor;

  return await checkoutTarget( repo, branch, includeNpmUpdate, callback, errorCallback );
};
