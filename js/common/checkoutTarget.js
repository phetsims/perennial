// Copyright 2017, University of Colorado Boulder

/**
 * Checks out a SHA/branch for a repository, and also checks out all of its dependencies.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const checkoutDependencies = require( './checkoutDependencies' );
const getDependencies = require( './getDependencies' );
const gitCheckout = require( './gitCheckout' );
const gitPull = require( './gitPull' );
const winston = require( 'winston' );

/**
 * Checks out a SHA/branch for a repository, and also checks out all of its dependencies.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - branch or SHA
 * @param {boolean} includeNpmUpdate
 * @returns {Promise.<Array.<string>>} - Resolves with checkedOutRepos
 */
module.exports = async function( repo, target, includeNpmUpdate ) {
  winston.info( `checking out shas for ${repo} ${target}` );

  await gitCheckout( repo, target );
  await gitPull( repo ); // Does this work for a SHA?
  const dependencies = await getDependencies( repo );
  return checkoutDependencies( repo, dependencies, includeNpmUpdate );
};
