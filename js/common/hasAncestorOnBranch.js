// Copyright 2018, University of Colorado Boulder

/**
 * Checks whether a sim branch's dependency has an ancestor commit in its tree.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getDependencies = require( './getDependencies' );
const gitCheckout = require( './gitCheckout' );
const gitIsAncestor = require( './gitIsAncestor' );
const winston = require( 'winston' );

/**
 * Checks whether a sim branch's dependency has an ancestor commit in its tree.
 * @public
 *
 * @param {string} sim
 * @param {string} branch
 * @param {string} repo
 * @param {string} sha
 * @returns {Promise.<boolean>} - Whether it is an ancestor or not
 * @rejects {ExecuteError}
 */
module.exports = async function( sim, branch, repo, sha ) {
  winston.info( `Checking whether ${repo} has commit ${sha} in its tree for the branch ${branch} of ${sim}` );

  await gitCheckout( sim, branch );
  const dependencies = await getDependencies( sim );

  if ( !dependencies[ repo ] ) {
    return false;
  }
  const repoSHA = dependencies[ repo ].sha;

  const isAncestor = await gitIsAncestor( repo, sha, repoSHA );
  await gitCheckout( sim, 'master' );

  return isAncestor;
};
