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
 * sage run js/scripts/test/release-branch-checks.js
 *
 * NOTE: refresh release branches if not doing an active MR:
 * cd perennial;
 * sage run js/grunt/tasks/sync-codebase.ts --allBranches
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

// Used for evaluating browser-side code in puppeteer tests.

const _ = require( 'lodash' );
const puppeteerLoad = require( '../../common/puppeteerLoad' );
const Maintenance = require( '../../common/Maintenance' );
const withServer = require( '../../common/withServer' );
const winston = require( 'winston' );
const puppeteer = require( 'puppeteer' );

winston.default.transports.console.level = 'error';

////////////////////////
// RUNNING OPTIONS:

// Test one sim from main, instead of from release-branches/. To test from main, ensure you first run
// `cd acid-base-solutions; grunt --brands=phet,phet-io --locales=*`
const TEST_FROM_MAIN = false;
// Log tests that pass in addition to failures.
const VERBOSE_LOG_SUCCESS = false;

const TEST_REGION_AND_CULTURE_GRACE = true; // https://github.com/phetsims/joist/issues/974
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

    const releaseBranches = TEST_FROM_MAIN ? [ null ] : await Maintenance.loadAllMaintenanceBranches();

    const getBuiltURLs = async releaseBranch => {
      const urls = [];
      const repo = releaseBranch ? releaseBranch.repo : 'acid-base-solutions';
      const branch = releaseBranch ? releaseBranch.branch : 'main';
      const releaseBranchPath = releaseBranch ? `release-branches/${repo}-${branch}/` : '';
      const buildDir = `http://localhost:${port}/${releaseBranchPath}${repo}/build`;

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

    const getUnbuiltURLs = async releaseBranch => {
      const urls = [];

      if ( !releaseBranch ) {
        const repo = 'acid-base-solutions';
        urls.push( `http://localhost:${port}/${repo}/${repo}_en.html?webgl=false` );
        urls.push( `http://localhost:${port}/${repo}/${repo}_en.html?webgl=false&brand=phet-io&phetioStandalone` );
        return urls;
      }

      const repo = releaseBranch.repo;
      const branch = releaseBranch.branch;
      urls.push( `http://localhost:${port}/release-branches/${repo}-${branch}/${repo}/${repo}_en.html?webgl=false` );

      if ( releaseBranch.brands.includes( 'phet-io' ) ) {
        const standaloneParams = await releaseBranch.getPhetioStandaloneQueryParameter();
        urls.push( `http://localhost:${port}/release-branches/${repo}-${branch}/${repo}/${repo}_en.html?webgl=false&${standaloneParams}&brand=phet-io` );
      }

      return urls;
    };

    const getAllURLs = async releaseBranch => {
      return [
        ...( await getBuiltURLs( releaseBranch ) ),
        ...( await getUnbuiltURLs( releaseBranch ) )
      ];
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
        waitAfterLoad: 3000,
        browser: browser
      } );

      return urls;
    };

    const evaluate = async ( url, evaluate, options ) => {
      try {
        return await puppeteerLoad( url, {
          ...options,
          evaluate: evaluate,
          gotoTimeout: 60000,
          waitAfterLoad: 2000,
          allowedTimeToLoad: 40000,
          browser: browser
          // , // eslint-disable-line comma-style
          // logConsoleOutput: true,
          // logger: console.log
        } );
      }
      catch( e ) {
        console.log( '    ERROR', e.message.split( '\n' )[ 0 ] );
        return `error running ${url}`;
      }
    };

    for ( const releaseBranch of releaseBranches ) {

      // releaseBranch=== null when running on main
      const isUnbultOnMain = !releaseBranch;

      const repo = isUnbultOnMain ? 'acid-base-solutions' : releaseBranch.repo;
      const branch = isUnbultOnMain ? 'main' : releaseBranch.branch;
      const releaseBranchPath = isUnbultOnMain ? '' : `release-branches/${repo}-${branch}/`;

      const urls = await getAllURLs( releaseBranch );

      console.log( '-', releaseBranch ? releaseBranch.toString() : repo );

      for ( const url of urls ) {

        const getUrlWithRegionAndCulture = regionAndCulture => url.includes( '?' ) ? `${url}&regionAndCulture=${regionAndCulture}` : `${url}?regionAndCulture=${regionAndCulture}`;

        const logStatus = ( status, message, loggedURL = url ) => {
          logResult( status, message, loggedURL );
        };


        if ( TEST_REGION_AND_CULTURE_GRACE ) {
          const toTest = [
            [ 'area-model-algebra', '1.3' ],
            [ 'area-model-decimals', '1.3' ],
            [ 'area-model-introduction', '1.3' ],
            [ 'area-model-multiplication', '1.3' ],
            [ 'energy-skate-park', '1.3' ],
            [ 'number-line-integers', '1.2' ],
            [ 'number-line-distance', '1.1' ]
          ];
          if ( _.includes( toTest, x => x[ 0 ] === releaseBranch.repo && x[ 1 ] === releaseBranch.branch ) ) {
            console.log( releaseBranch.toString() );
          }
        }
      }
    }
  } );

  browser.close();
} )();