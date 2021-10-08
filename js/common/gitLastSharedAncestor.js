// Copyright 2021, University of Colorado Boulder

/**
 * Provides the SHA of the last shared ancestor commit between two targets (branches/SHAs)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const assert = require( 'assert' );

/**
 * Provides the SHA of the last shared ancestor commit between two targets (branches/SHAs)
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} targetA - Branch/SHA
 * @param {string} targetB - Branch/SHA
 * @returns {Promise.<string>} - Resolves to the SHA
 */
module.exports = function( repo, targetA, targetB ) {
  assert( typeof repo === 'string' );
  assert( typeof targetA === 'string' );
  assert( typeof targetB === 'string' );

  return execute( 'git', [ 'merge-base', targetA, targetB ], `../${repo}` ).then( stdout => {
    return Promise.resolve( stdout.trim() );
  } );
};
