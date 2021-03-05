// Copyright 2021, University of Colorado Boulder

const _ = require( 'lodash' ); // eslint-disable-line
const fs = require( 'fs' );
const DateUtils = require( './DateUtils' );

/**
 * USAGE:
 * cd perennial
 * node js/phet-io/compare-macro-apis-over-time.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
( async () => {

  const filenames = DateUtils.getTestDates().map( date => DateUtils.toFilename( date ) );

  const jsons = filenames.map( filename => JSON.parse( fs.readFileSync( `./build-phet-io-macro-api/${filename}`, 'utf-8' ) ) );
  console.log( 'got jsons: ' + jsons.length );

  const compareMacroAPIs = require( '../../../chipper/js/phet-io/compareMacroAPIs' );
  for ( let i = 0; i < jsons.length - 1; i++ ) {
    const results = compareMacroAPIs( jsons[ i ], jsons[ i + 1 ] );
    console.log( results );
  }
} )();
