// Copyright 2018, University of Colorado Boulder

/**
 * git rev-parse
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const assert = require( 'assert' );

/**
 * Gets a single commit for a given query
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} query
 * @returns {Promise.<string>} - Resolves to the SHA.
 */
module.exports = function( repo, query ) {
  assert( typeof repo === 'string' );
  assert( typeof query === 'string' );

  return execute( 'git', [ 'rev-parse', query ], `../${repo}` ).then( stdout => {
    const sha = stdout.trim();
    if ( sha.length === 0 ) {
      return Promise.reject( new Error( 'No matching SHA' ) );
    }
    else if ( sha.length > 40 ) {
      return Promise.reject( new Error( 'Potentially multiple SHAs returned' ) );
    }
    else {
      return Promise.resolve( sha );
    }
  } );
};
