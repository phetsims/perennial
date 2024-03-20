// Copyright 2024, University of Colorado Boulder

/**
 * Checking yotta=false (https://github.com/phetsims/phetcommon/issues/65) and yotta*=*
 * (https://github.com/phetsims/phetcommon/issues/66) behavior on non-refreshed release branches.
 *
 * NOTE: refresh release branches if not doing an active MR.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const puppeteerLoad = require( '../../common/puppeteerLoad' );
const Maintenance = require( '../../common/Maintenance' );
const winston = require( 'winston' );
const puppeteer = require( 'puppeteer' );

winston.default.transports.console.level = 'error';

( async () => {
  const browser = await puppeteer.launch( {
    args: [
      '--disable-gpu'
    ]
  } );

  const getBaseURLs = async releaseBranch => {
    const buildDir = `http://localhost/release-branches/${releaseBranch.repo}-${releaseBranch.branch}/${releaseBranch.repo}/build`;

    const urls = [];

    const usesChipper2 = await releaseBranch.usesChipper2();

    if ( releaseBranch.brands.includes( 'phet' ) ) {
      urls.push( `${buildDir}/${usesChipper2 ? 'phet/' : ''}${releaseBranch.repo}_all${usesChipper2 ? '_phet' : ''}.html?webgl=false` );
    }
    if ( releaseBranch.brands.includes( 'phet-io' ) ) {
      const standaloneParams = await releaseBranch.getPhetioStandaloneQueryParameter();

      const phetioSuffix = usesChipper2 ? '_all_phet-io' : '_en-phetio';

      urls.push( `${buildDir}/${usesChipper2 ? 'phet-io/' : ''}${releaseBranch.repo}${phetioSuffix}.html?${standaloneParams}&webgl=false` );
    }

    return urls;
  };

  const getLoadedURLs = async url => {
    const urls = [];

    await puppeteerLoad( url, {
      onPageCreation: page => page.on( 'request', request => {
        const url = request.url();

        if ( !url.startsWith( 'data:' ) ) {
          urls.push( url );
        }
      } ),
      gotoTimeout: 60000,
      waitAfterLoad: 2000,
      browser: browser
    } );

    return urls;
  };

  const demoYottaQueryParameterKey = 'yottaSomeFlag';
  const demoYottaQueryParameterValue = 'someValue';

  const analyzeURLs = urls => {
    return {
      sentGoogleAnalytics: urls.some( url => url.includes( 'collect?' ) ),
      sentYotta: urls.some( url => url.includes( 'yotta/immediate.gif' ) ),
      sentExternalRequest: urls.some( url => !url.startsWith( 'http://localhost' ) ),
      hasDemoYottaQueryParameter: urls.some( url => {
        return new URLSearchParams( new URL( url ).search ).get( demoYottaQueryParameterKey ) === demoYottaQueryParameterValue;
      } )
    };
  };

  for ( const releaseBranch of await Maintenance.loadAllMaintenanceBranches() ) {
    console.log( releaseBranch.toString() );

    const urls = await getBaseURLs( releaseBranch );

    for ( const url of urls ) {
      const plainURL = url;
      const plainAnalysis = analyzeURLs( await getLoadedURLs( plainURL ) );
      if ( !plainAnalysis.sentGoogleAnalytics ) {
        console.log( '  No Google Analytics sent', plainURL );
      }
      if ( !plainAnalysis.sentYotta ) {
        console.log( '  No yotta sent', plainURL );
      }

      const yottaFalseURL = `${url}&yotta=false`;
      const yottaFalseAnalysis = analyzeURLs( await getLoadedURLs( yottaFalseURL ) );
      if ( yottaFalseAnalysis.sentExternalRequest || yottaFalseAnalysis.sentGoogleAnalytics || yottaFalseAnalysis.sentYotta ) {
        console.log( '  yotta=false sent something', yottaFalseAnalysis );
      }

      const yottaSomeFlagURL = `${url}&${demoYottaQueryParameterKey}=${demoYottaQueryParameterValue}`;
      const yottaSomeFlagAnalysis = analyzeURLs( await getLoadedURLs( yottaSomeFlagURL ) );
      if ( !yottaSomeFlagAnalysis.hasDemoYottaQueryParameter ) {
        console.log( `  No ${demoYottaQueryParameterKey}=${demoYottaQueryParameterValue} sent`, yottaSomeFlagAnalysis );
      }

      // Consider adding fuzzing in the future, it seems like we're unable to get things to run after a fuzz failure though
      // const fuzzURL = `${url}&fuzz&fuzzMouse&fuzzTouch&fuzzBoard`;
      // try {
      //   await puppeteerLoad( fuzzURL, {
      //     waitForFunction: 'window.phet.joist.sim',
      //     gotoTimeout: 60000,
      //     waitAfterLoad: 5000,
      //     browser: browser
      //   } );
      // }
      // catch( e ) {
      //   console.log( `fuzz failure on ${fuzzURL}:\n${e}` );
      // }
    }
  }

  browser.close();
} )();