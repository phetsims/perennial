// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';

const fs = require( 'fs.extra' ); // eslint-disable-line

module.exports = async function ( filepath, contents ) {
  return new Promise( ( reject, resolve ) => {
    fs.writeFile( filepath, contents, e => {
      if ( e ) { reject( e ); }
      else { resolve(); }
    } );
  });
};