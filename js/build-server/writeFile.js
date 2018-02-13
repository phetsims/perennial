// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const fs = require( 'fs.extra' ); // eslint-disable-line
const winston = require( 'winston' );

const ATTEMPTS = 3;

module.exports = async function ( filepath, contents ) {
  let count = 0;
  let success = false;
  while ( !success && count < ATTEMPTS ) {
    try {
      fs.writeFileSync( filepath, contents );
      success = true;
    }
    catch ( e ) {
      winston.error( e );
      winston.info( 'Error writing ' + filepath + ', will try again a few times' );
    }
    count += 1;
  }
};