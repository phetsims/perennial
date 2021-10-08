// Copyright 2018, University of Colorado Boulder

/**
 * Checks out a snapshot of a repo (and its dependencies) for a given timestamp/branch.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const checkoutDependencies = require( './checkoutDependencies' );
const getDependencies = require( './getDependencies' );
const gitCheckout = require( './gitCheckout' );
const gitFromTimestamp = require( './gitFromTimestamp' );
const winston = require( 'winston' );

/**
 * Checks out a snapshot of a repo (and its dependencies) for a given timestamp/branch.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} timestamp
 * @param {boolean} includeNpmUpdate
 * @returns {Promise.<Array.<string>>} - Resolves with checkedOutRepos
 */
module.exports = async function( repo, timestamp, includeNpmUpdate ) {
  winston.info( `checking out timestamp for ${repo} at ${timestamp}` );

  await gitCheckout( repo, await gitFromTimestamp( repo, 'master', timestamp ) );
  const dependencies = await getDependencies( repo );
  const dependencyNames = Object.keys( dependencies ).filter( key => key !== 'comment' && key !== repo );
  const timestampDependencies = {};
  for ( const dependency of dependencyNames ) {
    timestampDependencies[ dependency ] = {
      sha: await gitFromTimestamp( dependency, 'master', timestamp )
    };
  }

  return checkoutDependencies( repo, timestampDependencies, includeNpmUpdate );
};
