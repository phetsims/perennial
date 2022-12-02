// Copyright 2017, University of Colorado Boulder

/**
 * Prints out a list of HTML sims visible on the website.
 *
 * grunt doesn't work well with this, since grunt always prints out extra stuff to stdout. This is an independent
 * node.js script instead.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const simMetadata = require( '../common/simMetadata' );
const winston = require( 'winston' );

winston.default.transports.console.level = 'error';
simMetadata( {
  type: 'html'
}, data => {
  console.log( data.projects.map( project => project.name.slice( project.name.indexOf( '/' ) + 1 ) ).join( '\n' ) );
} );
