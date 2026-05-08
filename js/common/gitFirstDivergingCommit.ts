// Copyright 2021-2026, University of Colorado Boulder

/**
 * Provides the SHA of the first SHA from a target that diverges from the second target
 *
 * e.g. to get the first commit of acid-base-solutions' 1.2 branch that does not exist in main:
 *
 *   gitFirstDivergingCommit( 'acid-base-solutions', '1.2', 'main' )
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';

/**
 * @param {string} primaryTarget - Branch/SHA
 * @param {string} secondaryTarget - Branch/SHA
 * @returns {Promise.<string>} - Resolves to the SHA
 */
export const gitFirstDivergingCommit = async (
  primaryTarget: string,
  secondaryTarget: string
): Promise<string> => {
  return execute( 'git', [ 'log', `${secondaryTarget}...${primaryTarget}`, '--reverse', '--pretty=oneline' ], '..' ).then( stdout => {
    return Promise.resolve( stdout.trim().split( '\n' )[ 0 ].trim().split( ' ' )[ 0 ] );
  } );
};
