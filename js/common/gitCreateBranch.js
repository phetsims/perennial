// Copyright 2018, University of Colorado Boulder

/**
 * git checkout -b {{BRANCH}}
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const assert = require( 'assert' );
const winston = require( 'winston' );

/**
 * Executes git checkout -b {{BRANCH}}
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The branch name to create
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( repo, branch ) {
  assert( typeof repo === 'string' );
  assert( typeof branch === 'string' );

  winston.info( `git checkout -b ${branch} on ${repo}` );

  return execute( 'git', [ 'checkout', '-b', branch ], `../${repo}` );
};
