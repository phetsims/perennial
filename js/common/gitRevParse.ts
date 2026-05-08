// Copyright 2018-2026, University of Colorado Boulder

/**
 * git rev-parse
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';

/**
 * Gets a single commit for a given query
 * @returns {Promise.<string>} - Resolves to the SHA.
 */
export const gitRevParse = async ( query: string ): Promise<string> => {
  return execute( 'git', [ 'rev-parse', query ], '..' ).then( stdout => {
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
