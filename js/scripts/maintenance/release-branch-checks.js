// Copyright 2024, University of Colorado Boulder

/**
 * General checks to ensure release branches are working as expected.
 *
 * Different tests were added from various MR work. Paper trails:
 * - 3/20/24: Checking yotta=false (https://github.com/phetsims/phetcommon/issues/65) and yotta*=*
 *   (https://github.com/phetsims/phetcommon/issues/66) behavior on non-refreshed release branches.
 * - 5/14/24: new locale query parameter parsing: running on BABEL/localeData and supporting locale3/fallbacks/etc. (https://github.com/phetsims/joist/issues/963)
 * - 6/14/24: second locale MR for supporting in Standard PhET-iO Wrapper. (https://github.com/phetsims/joist/issues/970)
 *
 * USAGE:
 * cd perennial;
 * sage run js/scripts/maintenance/release-branch-checks.js
 *
 * NOTE: refresh release branches if not doing an active MR:
 * cd perennial;
 * sage run js/grunt/tasks/sync.ts --allBranches
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

// Used for evaluating browser-side code in puppeteer tests.

// const _ = require( 'lodash' );
const puppeteerLoad = require( '../../common/puppeteerLoad' );
const Maintenance = require( '../../common/Maintenance' ).default;
const withServer = require( '../../common/withServer' );
const winston = require( 'winston' );
const puppeteer = require( 'puppeteer' );
const fs = require( 'fs' );

winston.default.transports.console.level = 'error';

////////////////////////
// RUNNING OPTIONS:

// Test one sim from main, instead of from release-branches/. To test from main, ensure you first run
// `cd acid-base-solutions; grunt --brands=phet,phet-io --locales=*`
const TEST_FROM_MAIN = false;
// Log tests that pass in addition to failures.
const VERBOSE_LOG_SUCCESS = false;

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
    // await Maintenance.loadAllMaintenanceBranches();
    const releaseBranches = TEST_FROM_MAIN ? [ null ] : await Maintenance.loadAllMaintenanceBranches();
    // const releaseBranches = [];
    // const getBuiltURLs = async releaseBranch => {
    //   const urls = [];
    //   const repo = releaseBranch ? releaseBranch.repo : 'acid-base-solutions';
    //   const branch = releaseBranch ? releaseBranch.branch : 'main';
    //   const releaseBranchPath = releaseBranch ? `release-branches/${repo}-${branch}/` : '';
    //   const buildDir = `${server}/${releaseBranchPath}${repo}/build`;
    //
    //   if ( !releaseBranch ) {
    //     urls.push( `${buildDir}/phet/${repo}_all_phet_debug.html?webgl=false` );
    //     urls.push( `${buildDir}/phet-io/${repo}_all_phet-io.html?webgl=false&phetioStandalone` );
    //     return urls;
    //   }
    //
    //   const usesChipper2 = await releaseBranch.usesChipper2();
    //
    //   if ( releaseBranch.brands.includes( 'phet' ) ) {
    //     // urls.push( `${buildDir}/${usesChipper2 ? 'phet/' : ''}${repo}_all${usesChipper2 ? '_phet' : ''}.html?webgl=false` );
    //   }
    //   if ( releaseBranch.brands.includes( 'phet-io' ) ) {
    //     const standaloneParams = await releaseBranch.getPhetioStandaloneQueryParameter();
    //
    //     const phetioSuffix = usesChipper2 ? '_all_phet-io' : '_en-phetio';
    //
    //     urls.push( `${buildDir}/${usesChipper2 ? 'phet-io/' : ''}${repo}${phetioSuffix}.html?${standaloneParams}&webgl=false` );
    //   }
    //
    //   return urls;
    // };
    //
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
          browser: browser
          , // eslint-disable-line comma-style
          logConsoleOutput: true,
          logger: console.log
        } );
      }
      catch( e ) {
        console.log( '    ERROR', e.message.split( '\n' )[ 0 ] );
        return `error running ${url}`;
      }
    };
    //
    // const evaluateSimLoad = async ( url, options ) => {
    //   return evaluate( url, 'phet.joist.sim.isConstructionCompleteProperty.value', {
    //     waitForFunction: 'window.phet?.joist?.sim && phet.joist.sim.isConstructionCompleteProperty.value',
    //     waitAfterLoad: 0,
    //     ...options
    //   } );
    // };
    const wrapperTestTemplate = fs.readFileSync( '../sandbox/html.html', 'utf-8' );

    for ( const releaseBranch of releaseBranches ) {

      if ( !await releaseBranch.isPhetioHydrogen() ) {
        continue;
      }

      // releaseBranch=== null when running on main
      const isUnbultOnMain = !releaseBranch;
      const repo = isUnbultOnMain ? 'acid-base-solutions' : releaseBranch.repo;
      // const urls = await getAllURLs( releaseBranch );

      console.log( '-', releaseBranch ? releaseBranch.toString() : repo );

      const libs = [
        // `https://phet-io.colorado.edu/sims/${repo}/${releaseBranch.branch}/lib/phet-io.js`
        `${server}/release-branches/${repo}-${releaseBranch.branch}/${repo}/build/phet-io/lib/phet-io.js`
      ];

      for ( const urlLib of libs ) {

        fs.writeFileSync( '../sandbox/html2.html', wrapperTestTemplate.replace( /\{\{LIB}}/g, urlLib ) );
        const wrapperName = `sandbox/testWrapper-${repo}.html`;
        await puppeteerLoad( `${server}/sandbox/html2.html`, {
          // logConsoleOutput: true,
          // logNavigation: true,
          // logLifeCycleOutput: true,
          browser: browser,
          logger: console.log,
          resolveFromLoad: false,
          cachePages: false,
          onPageCreation: async ( page, resolve ) => {
            await page.exposeFunction( 'giveStandardWrapperHTML', html => {
              fs.writeFileSync( `../${wrapperName}`, html );
              resolve();
            } );
          },
          waitAfterLoad: 1000000
        } );

        const regionAndCultures = [
          '&regionAndCulture=',
          '&regionAndCulture=usa',
          '&regionAndCulture=africa',
          '&regionAndCulture=fjdskalfjdskla'
        ];
        for ( const regionAndCulture of regionAndCultures ) {
          const regionURL = `${server}/${wrapperName}?${regionAndCulture}`;
          console.log( regionURL );
          const loaded = await evaluate( regionURL, 'true', {
            cachePages: false,
            waitForFunction: 'phetioClient.simStarted',
            onPageCreation: page => {
              page.on( 'dialog', async dialog => {
                await dialog.accept();
              } );
            }
          } );
          logResult( loaded, regionAndCulture, regionURL );
        }

        // for ( const url of urls ) {

        // const logStatus = ( status, message, loggedURL = url ) => {
        //   logResult( status, message, loggedURL );
        // };
        //
        // const loaded = await evaluateSimLoad( url );
        // logStatus( loaded, 'sim loaded' );
        // }
      }
    }
  } );

  await browser.close();
} )();