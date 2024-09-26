// Copyright 2017-2018, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)

const fs = require( 'graceful-fs' ); // eslint-disable-line phet/require-statement-match

module.exports = async function( src, dest ) {
  return new Promise( ( resolve, reject ) => {
    fs.copyFile( src, dest, err => {
      if ( err ) {
        reject( err );
      }
      else {
        resolve();
      }
    } );
  } );
};