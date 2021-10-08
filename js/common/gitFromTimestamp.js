// Copyright 2018, University of Colorado Boulder

/**
 * git rev-list -1 --before="{{TIMESTAMP}}" {{BRANCH}}
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const assert = require( 'assert' );

/**
 * Gets the best SHA from a given branch at the given timestamp
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The SHA/branch/whatnot to check out
 * @param {string} timestamp
 * @returns {Promise.<string>} - Resolves to the SHA
 */
module.exports = function( repo, branch, timestamp ) {
  assert( typeof repo === 'string' );
  assert( typeof branch === 'string' );
  assert( typeof timestamp === 'string' );

  return execute( 'git', [ 'rev-list', '-1', `--before="${timestamp}"`, branch ], `../${repo}` ).then( stdout => {
    const sha = stdout.trim();
    if ( sha.length === 0 ) {
      return Promise.reject( new Error( 'No matching SHA for timestamp' ) );
    }
    else {
      return Promise.resolve( sha );
    }
  } );
};
