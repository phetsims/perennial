// Copyright 2020, University of Colorado Boulder

/**
 * Provides the timestamp of the latest commit
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const assert = require( 'assert' );

/**
 * Provides the timestamp of the latest commit
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<number>} - Resolves to the timestamp
 */
module.exports = function( repo ) {
  assert( typeof repo === 'string' );

  return execute( 'git', [ 'log', '-1', '--pretty=format:%cd', '--date=iso' ], `../${repo}` ).then( stdout => {
    return Promise.resolve( new Date( stdout.trim() ).getTime() );
  } );
};
