// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';

const fs = require( 'graceful-fs' ); // eslint-disable-line

module.exports = async function ( src, dest ) {
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