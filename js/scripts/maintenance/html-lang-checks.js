// Copyright 2025, University of Colorado Boulder

/**
 * USAGE:
 * cd perennial;
 * sage run js/scripts/maintenance/html-lang-checks.js
 *
 * NOTE: refresh release branches if not doing an active MR:
 * cd perennial;
 * sage run js/grunt/tasks/sync.ts --allBranches
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const puppeteerLoad = require( '../../common/puppeteerLoad' );
const Maintenance = require( '../../common/Maintenance' ).default;
const withServer = require( '../../common/withServer' );
const winston = require( 'winston' );
const puppeteer = require( 'puppeteer' );

winston.default.transports.console.level = 'error';

// Log tests that pass in addition to failures.
const VERBOSE_LOG_SUCCESS = true;

///////////////////////////////////////////////

const logResult = ( success, message, url ) => {
  if ( success ) {
    VERBOSE_LOG_SUCCESS && console.log( `      [OK] ${message} URL: ${url}` );
  }
  else {
    console.log( `  [FAIL] ${message} URL: ${url}` );
  }
};

( async () => {
  const browser = await puppeteer.launch( {
    args: [
      '--disable-gpu'
    ]
  } );

  // Use withServer for cross-dev environment execution.
  await withServer( async port => {
    const server = `http://localhost:${port}`;
    const releaseBranches = await Maintenance.loadAllMaintenanceBranches();

    const getBuiltURLs = async releaseBranch => {
      const urls = [];
      const repo = releaseBranch ? releaseBranch.repo : 'acid-base-solutions';
      const branch = releaseBranch ? releaseBranch.branch : 'main';
      const releaseBranchPath = releaseBranch ? `release-branches/${repo}-${branch}/` : '';
      const buildDir = `${server}/${releaseBranchPath}${repo}/build`;

      if ( !releaseBranch ) {
        urls.push( `${buildDir}/phet/${repo}_all_phet_debug.html?webgl=false` );
        urls.push( `${buildDir}/phet-io/${repo}_all_phet-io.html?webgl=false&phetioStandalone` );
        return urls;
      }

      const usesChipper2 = await releaseBranch.usesChipper2();

      if ( releaseBranch.brands.includes( 'phet' ) ) {
        urls.push( `${buildDir}/${usesChipper2 ? 'phet/' : ''}${repo}_all${usesChipper2 ? '_phet' : ''}.html?webgl=false` );
      }
      if ( releaseBranch.brands.includes( 'phet-io' ) ) {
        const standaloneParams = await releaseBranch.getPhetioStandaloneQueryParameter();

        const phetioSuffix = usesChipper2 ? '_all_phet-io' : '_en-phetio';

        urls.push( `${buildDir}/${usesChipper2 ? 'phet-io/' : ''}${repo}${phetioSuffix}.html?${standaloneParams}&webgl=false` );
      }

      return urls;
    };

    // const getUnbuiltURLs = async releaseBranch => {
    //   const urls = [];
    //
    //   if ( !releaseBranch ) {
    //     const repo = 'acid-base-solutions';
    //     urls.push( `${server}/${repo}/${repo}_en.html?webgl=false` );
    //     urls.push( `${server}/${repo}/${repo}_en.html?webgl=false&brand=phet-io&phetioStandalone` );
    //     return urls;
    //   }
    //
    //   const repo = releaseBranch.repo;
    //   const branch = releaseBranch.branch;
    //   urls.push( `${server}/release-branches/${repo}-${branch}/${repo}/${repo}_en.html?webgl=false` );
    //
    //   if ( releaseBranch.brands.includes( 'phet-io' ) ) {
    //     const standaloneParams = await releaseBranch.getPhetioStandaloneQueryParameter();
    //     urls.push( `${server}/release-branches/${repo}-${branch}/${repo}/${repo}_en.html?webgl=false&${standaloneParams}&brand=phet-io` );
    //   }
    //
    //   return urls;
    // };
    //
    // const getAllURLs = async releaseBranch => {
    //   return [
    //     ...( await getBuiltURLs( releaseBranch ) )
    //     // ...( await getUnbuiltURLs( releaseBranch ) )
    //   ];
    // };
    //
    // // What URLS were called during sim load
    // const getLoadedURLs = async url => {
    //   const urls = [];
    //
    //   await puppeteerLoad( url, {
    //     onPageCreation: page => page.on( 'request', request => {
    //       const url = request.url();
    //
    //       if ( !url.startsWith( 'data:' ) ) {
    //         urls.push( url );
    //       }
    //     } ),
    //     gotoTimeout: 60000,
    //     waitAfterLoad: 3000,
    //     browser: browser
    //   } );
    //
    //   return urls;
    // };

    const evaluate = async ( url, evaluate, options ) => {
      try {
        return await puppeteerLoad( url, {
          ...options,
          evaluate: evaluate,
          gotoTimeout: 60000,
          waitAfterLoad: 2000,
          allowedTimeToLoad: 40000,
          browser: browser,
          logConsoleOutput: true,
          logger: console.log
        } );
      }
      catch( e ) {
        console.log( '    ERROR', e.message.split( '\n' )[ 0 ] );
        return `error running ${url}`;
      }
    };

    for ( const releaseBranch of releaseBranches ) {
      const builtURLs = await getBuiltURLs( releaseBranch );

      console.log( '-', releaseBranch.toString() );

      for ( const url of builtURLs ) {
        const launchLang = await evaluate( url, 'document.documentElement.lang' );
        logResult( launchLang === 'en', `lang en: ${launchLang}`, url );

        if ( url.includes( '_all' ) ) {
          const spanishLang = await evaluate( `${url}&locale=es`, 'document.documentElement.lang' );
          logResult( spanishLang === 'es', `_all lang es: ${spanishLang}`, `${url}&locale=es` );

          const dynamicLang = await evaluate( url, '( () => { if ( phet.joist.localeProperty ) { phet.joist.localeProperty.value = \'es\'; return document.documentElement.lang; } else { return false; } } )()' );
          logResult( dynamicLang === 'es' || dynamicLang === false, `dynamic lang es: ${dynamicLang}`, url );
        }

        const response = await fetch( url );
        if ( response.ok ) {
          const htmlContent = await response.text();
          const hasLangAttribute = htmlContent.includes( 'html lang="' );
          logResult( hasLangAttribute, 'HTML lang', url );
        }
      }
    }
  } );

  await browser.close();
} )();