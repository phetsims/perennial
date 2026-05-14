// Copyright 2017-2026, University of Colorado Boulder

/**
 * Gets a mapping from branch name to branch SHA from the remote
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitImmutableExecute } from './gitMutex.js';
import { Branch, SHA } from '../browser-and-node/PerennialTypes.js';

export const getBranchSHAMap = async (): Promise<Record<Branch, SHA>> => {
  winston.debug( 'retrieving branches' );

  const map: Record<string, string> = {};

  ( await gitImmutableExecute( [ 'ls-remote' ], '..' ) ).split( '\n' ).forEach( line => {
    const match = line.trim().match( /^(\S+)\s+refs\/heads\/(\S+)$/ );
    if ( match ) {
      map[ match[ 2 ] ] = match[ 1 ];
    }
  } );

  return map;
};
