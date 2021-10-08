// Copyright 2017, University of Colorado Boulder

/**
 * Returns the branch (if any) that the repository is on.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );

/**
 * Returns the branch (if any) that the repository is on.
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise} - Resolves to the branch name (or the empty string if not on a branch)
 */
module.exports = function( repo ) {
  return execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], `../${repo}` ).then( stdout => stdout.trim().replace( 'refs/heads/', '' ) );
};
