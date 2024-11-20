// Copyright 2019, University of Colorado Boulder

/**
 * Error out if Node version is out of date. Uses process.version
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

// constants
const NODE_VERSION_STRING_PARTS = process.version.replace( 'v', '' ).split( '.' );
const NODE_MAJOR_VERSION = Number( NODE_VERSION_STRING_PARTS[ 0 ] );
const NODE_MINOR_VERSION = Number( NODE_VERSION_STRING_PARTS[ 1 ] );
if ( NODE_MAJOR_VERSION < 18 ||
     ( NODE_MAJOR_VERSION === 18 && NODE_MINOR_VERSION < 18 ) ||
     ( NODE_MAJOR_VERSION === 20 && NODE_MINOR_VERSION < 9 ) ) {
  throw new Error( 'Node 18.18 or 20.9 or greater is needed to run PhET build tools' );
}