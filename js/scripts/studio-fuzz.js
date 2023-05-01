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

  while ( true ) { // eslint-disable-line no-constant-condition
    let studioFuzz = null;

    console.log( 'starting new fuzz' );

    try {
      await withServer( async port => {
        const url = `http://localhost:${port}/studio/index.html?sim=states-of-matter&phetioElementsDisplay=all&fuzz`;
        await puppeteerLoad( url, {
          waitAfterLoad: 10000,
          allowedTimeToLoad: 120000,
          gotoTimeout: 120000,
          launchOptions: {

            // With this flag, temp files are written to /tmp/ on bayes, which caused https://github.com/phetsims/aqua/issues/145
            // /dev/shm/ is much bigger
            ignoreDefaultArgs: [ '--disable-dev-shm-usage' ],

            // Command line arguments passed to the chrome instance,
            args: [
              '--enable-precise-memory-info',

              // To prevent filling up `/tmp`, see https://github.com/phetsims/aqua/issues/145
              `--user-data-dir=${process.cwd()}/../tmp/puppeteerUserData/`
            ]
          }
        } );
      } );
    }
    catch( e ) {
      studioFuzz = e;
    }

    console.log( studioFuzz );
  }
} )();