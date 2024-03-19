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

winston.default.transports.console.level = 'error';

const getBaseURL = async releaseBranch => {
  const usesChipper2 = await releaseBranch.usesChipper2();

  return `http://localhost/release-branches/${releaseBranch.repo}-${releaseBranch.branch}/${releaseBranch.repo}/build/${usesChipper2 ? 'phet/' : ''}${releaseBranch.repo}_en${usesChipper2 ? '_phet' : ''}.html`;
};

const getLoadedURLs = async url => {
  const urls = [];

  await puppeteerLoad( url, {
    onPageCreation: page => page.on( 'request', request => {
      const url = request.url();

      if ( !url.startsWith( 'data:' ) ) {
        urls.push( url );
      }
    } )
    // logConsoleOutput: true,
    // logNavigation: true,
    // logger: console.log
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

( async () => {
  for ( const releaseBranch of await Maintenance.loadAllMaintenanceBranches() ) {
    console.log( releaseBranch.toString() );

    const plainAnalysis = analyzeURLs( await getLoadedURLs( await getBaseURL( releaseBranch ) ) );
    const yottaFalseAnalysis = analyzeURLs( await getLoadedURLs( `${await getBaseURL( releaseBranch )}?yotta=false` ) );
    const yottaSomeFlagAnalysis = analyzeURLs( await getLoadedURLs( `${await getBaseURL( releaseBranch )}?${demoYottaQueryParameterKey}=${demoYottaQueryParameterValue}` ) );

    if ( !plainAnalysis.sentGoogleAnalytics ) {
      console.log( '  No Google Analytics sent' );
    }
    if ( !plainAnalysis.sentYotta ) {
      console.log( '  No yotta sent' );
    }

    if ( yottaFalseAnalysis.sentExternalRequest || yottaFalseAnalysis.sentGoogleAnalytics || yottaFalseAnalysis.sentYotta ) {
      console.log( '  yotta=false sent something' );
    }

    if ( !yottaSomeFlagAnalysis.hasDemoYottaQueryParameter ) {
      console.log( `  No ${demoYottaQueryParameterKey}=${demoYottaQueryParameterValue} sent` );
    }
  }
} )();

