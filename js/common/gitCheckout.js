// Copyright 2017, University of Colorado Boulder

/**
 * git checkout
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const assert = require( 'assert' );
const winston = require( 'winston' );

/**
 * Executes git checkout
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - The SHA/branch/whatnot to check out
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( repo, target ) {
  assert( typeof repo === 'string' );
  assert( typeof target === 'string' );

  winston.info( `git checkout ${target} on ${repo}` );

  return execute( 'git', [ 'checkout', target ], `../${repo}` );
};
