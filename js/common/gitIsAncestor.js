// Copyright 2017, University of Colorado Boulder

/**
 * Whether a git commit is an ancestor of another.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Whether a git commit is an ancestor of another
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} possibleAncestor
 * @param {string} possibleDescendant
 * @returns {Promise.<boolean>} - Whether it is an ancestor or not
 * @rejects {ExecuteError}
 */
module.exports = function( repo, possibleAncestor, possibleDescendant ) {
  winston.info( `git check (in ${repo}) for whether ${possibleAncestor} is an ancestor of ${possibleDescendant}` );

  return execute( 'git', [ 'merge-base', '--is-ancestor', possibleAncestor, possibleDescendant ], `../${repo}` ).then( stdout => Promise.resolve( true ), mergeError => {
    if ( mergeError.code === 1 ) {
      return Promise.resolve( false );
    }
    else {
      return Promise.reject( mergeError );
    }
  } );
};
