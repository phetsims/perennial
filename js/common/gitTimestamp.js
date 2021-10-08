// Copyright 2021, University of Colorado Boulder

/**
 * Provides the timestamp of any git target (branch/SHA)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const assert = require( 'assert' );

/**
 * Provides the timestamp of any git target (branch/SHA)
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} target - Branch/SHA
 * @returns {Promise.<number>} - Resolves to the timestamp
 */
module.exports = function( repo, target ) {
  assert( typeof repo === 'string' );
  assert( typeof target === 'string' );

  return execute( 'git', [ 'show', '-s', '--format=%cd', '--date=iso', target ], `../${repo}` ).then( stdout => {
    return Promise.resolve( new Date( stdout.trim() ).getTime() );
  } );
};
