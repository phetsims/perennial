// Copyright 2017, University of Colorado Boulder

/**
 * git checkout
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const assert = require( 'assert' );
const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Executes git checkout
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - The SHA/branch/whatnot to check out
 * @returns {Promise} - See execute for details
 */
module.exports = function( repo, target ) {
  assert( typeof repo === 'string' );
  assert( typeof target === 'string' );

  winston.info( `git checkout ${target} on ${repo}` );

  return execute( 'git', [ 'checkout', target ], `../${repo}` );
};
