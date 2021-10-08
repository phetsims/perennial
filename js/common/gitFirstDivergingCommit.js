// Copyright 2021, University of Colorado Boulder

/**
 * Provides the SHA of the first SHA from a target that diverges from the second target
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const assert = require( 'assert' );

/**
 * Provides the SHA of the first SHA from a target that diverges from the second target
 * @public
 *
 * e.g. to get the first commit of acid-base-solutions' 1.2 branch that does not exist in master:
 *
 *   gitFirstDivergingCommit( 'acid-base-solutions', '1.2', 'master' )
 *
 * @param {string} repo - The repository name
 * @param {string} primaryTarget - Branch/SHA
 * @param {string} secondaryTarget - Branch/SHA
 * @returns {Promise.<string>} - Resolves to the SHA
 */
module.exports = function( repo, primaryTarget, secondaryTarget ) {
  assert( typeof repo === 'string' );
  assert( typeof primaryTarget === 'string' );
  assert( typeof secondaryTarget === 'string' );

  return execute( 'git', [ 'log', `${secondaryTarget}...${primaryTarget}`, '--reverse', '--pretty=oneline' ], `../${repo}` ).then( stdout => {
    return Promise.resolve( stdout.trim().split( '\n' )[ 0 ].trim().split( ' ' )[ 0 ] );
  } );
};
