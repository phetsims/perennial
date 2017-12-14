// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const fs = require( 'fs.extra' ); // eslint-disable-line
const winston = require( 'winston' );

/**
 * execute mkdir for the sim version directory if it doesn't exist
 * @param targetDirectory:String
 * @param callback
 */
module.exports = function mkVersionDir( targetDirectory ) {
  try {
    fs.mkdirpSync( targetDirectory );
  }
  catch( e ) {
    winston.log( 'error', 'in mkVersionDir ' + e );
    winston.log( 'error', 'build failed' );
    throw e;
  }
};