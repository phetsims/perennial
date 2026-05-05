// Copyright 2026, University of Colorado Boulder

/**
 * Gets a list of branch names from the origin (for totality)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import winston from 'winston';

export const getTotalityBranches = async (): Promise<string[]> => {
  winston.debug( 'retrieving branches from totality' );

  return ( await execute( 'git', [ 'ls-remote' ], '..' ) ).split( '\n' ).filter( line => line.includes( 'refs/heads/' ) ).map( line => {
    const match = line.match( /refs\/heads\/(.*)/ );

    if ( match ) {
      return match[ 1 ].trim();
    }
    else {
      throw new Error( `Unexpected line from git ls-remote: ${line}` );
    }
  } );
};
