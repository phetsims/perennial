// Copyright 2017-2026, University of Colorado Boulder

/**
 * Gets a mapping from branch name to branch SHA from the remote
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

/**
 * @returns {Promise.<Object>} - Object map from branch => sha {string}
 * @rejects {ExecuteError}
 */
export const getBranchSHAMap = async (): Promise<Record<string, string>> => {
  winston.debug( 'retrieving branches' );

  const map: Record<string, string> = {};

  ( await execute( 'git', [ 'ls-remote' ], '..' ) ).split( '\n' ).forEach( line => {
    const match = line.trim().match( /^(\S+)\s+refs\/heads\/(\S+)$/ );
    if ( match ) {
      map[ match[ 2 ] ] = match[ 1 ];
    }
  } );

  return map;
};
