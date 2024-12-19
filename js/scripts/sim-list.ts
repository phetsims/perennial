// Copyright 2024, University of Colorado Boulder

/**
 * Prints out a list of live production HTML sims to stderr (can be filtered from other stdout output)
 * --versions : Outputs the sim version after its name.
 *
 * grunt doesn't work well with this, since grunt always prints out extra stuff to stdout. This is an independent
 * node.js script instead.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import winston from 'winston';
import simMetadata from '../common/simMetadata.js';
import getOption from '../grunt/tasks/util/getOption.js';

winston.default.transports.console.level = 'error';

( async () => {
  const data = await simMetadata( {
    type: 'html'
  } );
  console.log( data.projects.map( project => {
    let result = project.name.slice( project.name.indexOf( '/' ) + 1 );
    if ( getOption( 'versions' ) ) {
      result += ` ${project.version.major}.${project.version.minor}.${project.version.dev}`;
    }
    return result;
  } ).join( '\n' ) );
} )();