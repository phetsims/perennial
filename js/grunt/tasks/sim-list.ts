// Copyright 2024, University of Colorado Boulder

import winston from 'winston';
/**
 * Prints out a list of live production HTML sims to stderr (can be filtered from other stdout output)
 * --versions : Outputs the sim version after its name.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import simMetadata from '../../common/simMetadata';
import getOption from './util/getOption.ts';

( async () => {
  winston.default.transports.console.level = 'error';
  const data = await simMetadata( {
    type: 'html'
  } );
  // @ts-expect-error, remove in https://github.com/phetsims/perennial/issues/369
  console.error( data.projects.map( project => {
    const name = project.name.slice( project.name.indexOf( '/' ) + 1 );

    let result = name;
    if ( getOption( 'versions' ) ) {
      result += ` ${project.version.major}.${project.version.minor}.${project.version.dev}`;
    }
    return result;
  } ).join( '\n' ) );
} )();