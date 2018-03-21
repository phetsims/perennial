// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';

const fs = require( 'graceful-fs' ); // eslint-disable-line
const winston = require( 'winston' );

module.exports = async function ( filepath, contents ) {
  return new Promise( ( resolve, reject ) => {
    winston.info( 'Writing file to path: ' + filepath );
    fs.writeFile( filepath, contents, err => {
      if ( err ) {
        reject( err );
      }
      else {
        resolve();
      }
    } );
  } );
};