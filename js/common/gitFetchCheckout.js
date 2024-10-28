// Copyright 2021, University of Colorado Boulder

/**
 * git checkout, for SHAs only, but will fetch if the sha doesn't exist locally
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const gitCheckout = require( './gitCheckout.js' );
const gitDoesCommitExist = require( './gitDoesCommitExist.js' );
const gitFetch = require( './gitFetch.js' );
const assert = require( 'assert' );

/**
 * Executes git checkout, but will fetch if the sha doesn't exist locally
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} sha - The SHA to check out
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = async function( repo, sha ) {
  assert( typeof repo === 'string' );
  assert( typeof sha === 'string' );

  if ( !await gitDoesCommitExist( repo, sha ) ) {
    await gitFetch( repo );
  }

  return gitCheckout( repo, sha );
};