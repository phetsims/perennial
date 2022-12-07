// Copyright 2017-2018, University of Colorado Boulder


const fs = require( 'graceful-fs' ); // eslint-disable-line require-statement-match

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