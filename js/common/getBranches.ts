// Copyright 2017-2026, University of Colorado Boulder

/**
 * Gets a list of branch names from the origin
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

export const getBranches = async (): Promise<string[]> => {
  winston.debug( 'retrieving branches' );

  return ( await execute( 'git', [ 'ls-remote' ], '..' ) ).split( '\n' ).filter( line => line.includes( 'refs/heads/' ) ).map( line => {
    return line.match( /refs\/heads\/(.*)/ )![ 1 ].trim();
  } );
};
