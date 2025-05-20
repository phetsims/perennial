// Copyright 2017, University of Colorado Boulder

/**
 * git checkout
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const gitCheckoutDirectory = require( './gitCheckoutDirectory' );
const assert = require( 'assert' );

/**
 * Executes git checkout
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - The SHA/branch/whatnot to check out
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = async function gitCheckout( repo, target ) {
  assert( typeof repo === 'string' );
  assert( typeof target === 'string' );

  return gitCheckoutDirectory( target, `../${repo}` );
};