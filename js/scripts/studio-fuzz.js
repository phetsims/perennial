// Copyright 2021, University of Colorado Boulder

/**
 * Continuously running Studio fuzzing for testing
 *
 * @author Chris Klusendorf (PhET Interactive Simulations)
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const puppeteerLoad = require( '../common/puppeteerLoad' );
const withServer = require( '../common/withServer' );

( async () => {

  while ( true ) { // eslint-disable-line
    let studioFuzz = null;

    console.log( 'starting new fuzz' );

    try {
      await withServer( async port => {
        const url = `http://localhost:${port}/studio/index.html?sim=states-of-matter&phetioElementsDisplay=all&fuzz`;
        const error = await puppeteerLoad( url, {
          waitAfterLoad: 10000,
          allowedTimeToLoad: 120000,
          puppeteerTimeout: 120000
        } );
        if ( error ) {
          studioFuzz = error;
        }
      } );
    }
    catch( e ) {
      studioFuzz = e;
    }

    console.log( studioFuzz );
  }

} )();