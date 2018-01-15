// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const fs = require( 'fs.extra' ); // eslint-disable-line

const ATTEMPTS = 3;
const INTERVAL = 500;

module.exports = async function ( filepath, contents ) {
  let count = 0;
  const writeInterval = setInterval( () => {
    try {
      fs.writeFileSync( filepath, contents );
    }
    catch ( e ) {
      winston.error( e );
      winston.info( 'Error writing ' + filepath + ', will try again a few times' );
    }
    if ( count >= ATTEMPTS ) {
      clearInterval( writeInterval );
    }
    count += 1;
  }, INTERVAL );
};