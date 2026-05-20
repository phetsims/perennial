// Copyright 2017-2026, University of Colorado Boulder

/**
 * Gets a list of branch names from the origin
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitImmutableExecute } from './gitMutex.js';
import { Branch } from '../../browser-and-node/PerennialTypes.js';

export const getBranches = async (): Promise<Branch[]> => {
  winston.debug( 'retrieving branches' );

  return ( await gitImmutableExecute( [ 'ls-remote' ], '..' ) ).split( '\n' ).filter( line => line.includes( 'refs/heads/' ) ).map( line => {
    return line.match( /refs\/heads\/(.*)/ )![ 1 ].trim();
  } );
};
