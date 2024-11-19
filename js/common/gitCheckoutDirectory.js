// Copyright 2017, University of Colorado Boulder

/**
 * git checkout
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' ).default;
const assert = require( 'assert' );
const winston = require( 'winston' );

/**
 * Executes git checkout
 * @public
 *
 * @param {string} target - The SHA/branch/whatnot to check out
 * @param {string} directory - The working cwd directory
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function gitCheckoutDirectory( target, directory ) {
  assert( typeof target === 'string' );
  assert( typeof directory === 'string' );

  winston.info( `git checkout ${target} in ${directory}` );

  return execute( 'git', [ 'checkout', target ], directory );
};