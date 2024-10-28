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
 * node js/scripts/test/release-branch-checks.js
 *
 * NOTE: refresh release branches if not doing an active MR:
 * cd perennial;
 * node js/scripts/main-pull-status.js --allBranches
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const _ = require( 'lodash' );
const puppeteerLoad = require( '../../common/puppeteerLoad.js' );
const Maintenance = require( '../../common/Maintenance.js' );
const withServer = require( '../../common/withServer.js' );
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

// Specific tests to run
const TEST_LOCALES = true; // general locale feature upgrade
const TEST_ANALYTICS = false; // GA analytics testing
const TEST_PHET_IO_LOCALE = true; // phet-io + standard wrapper locale testing
const SKIP_TITLE_STRING_PATTERN = true;
///////////////////////////////////////////////

const localeData = JSON.parse( fs.readFileSync( '../babel/localeData.json', 'utf8' ) );

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

        // Because `planet` and `planet.controls.title` keys present in translations OVERLAP in the string object created by
        // getStringModule, and FAILS hard on these. Built versions work ok.
        if ( repo === 'gravity-force-lab' && branch === '2.2' && url.includes( '_en.html' ) ) {
          console.log( ' skipping gravity-force-lab 2.2 unbuilt, since planet / planet.controls.title strings in translations will not run in unbuilt mode' );
          continue;
        }
        if ( repo === 'gravity-force-lab-basics' && branch === '1.1' && url.includes( '_en.html' ) ) {
          console.log( ' skipping gravity-force-lab 2.2 unbuilt, since planet / planet.controls.title strings in translations will not run in unbuilt mode' );
          continue;
        }

        const getUrlWithLocale = locale => url.includes( '?' ) ? `${url}&locale=${locale}` : `${url}?locale=${locale}`;
        const getLocaleSpecificURL = locale => {
          return isUnbultOnMain ? url.replace( '_all_phet_debug', `_${locale}_phet` ) : url.replace( '_all', `_${locale}` );
        };

        const logStatus = ( status, message, loggedURL = url ) => {
          logResult( status, message, loggedURL );
        };

        if ( TEST_LOCALES ) {
          // Check locale MR. es_PY should always be in localeData
          const localeValues = await evaluate( url, () => [ !!phet.chipper.localeData, !!( phet.chipper.localeData?.es_PY ) ] );
          logStatus( localeValues[ 0 ] && localeValues[ 1 ], 'localeData (general, es_PY)' );

          const getRunningLocale = async locale => evaluate( getUrlWithLocale( locale ), () => phet.chipper.locale );

          const esLocale = await getRunningLocale( 'es' );
          logStatus( esLocale === 'es', 'es phet.chipper.locale' );

          const spaLocale = await getRunningLocale( 'spa' );
          logStatus( spaLocale === 'es', 'spa phet.chipper.locale' );

          const espyLocale = await getRunningLocale( 'ES_PY' );
          logStatus( espyLocale === 'es' || espyLocale === 'es_PY', 'ES_PY phet.chipper.locale' );

          const armaLocale = await getRunningLocale( 'ar_SA' );
          const armaStatus = armaLocale === 'ar' || armaLocale === 'ar_SA' || armaLocale === 'ar_MA' || ( repo.includes( 'projectile-' ) && armaLocale === 'en' );
          logStatus( armaStatus, 'ar_SA phet.chipper.locale' );

          const invalidLocale = await getRunningLocale( 'aenrtpyarntSRTS' );
          logStatus( invalidLocale === 'en', 'nonsense phet.chipper.locale' );

          const repoPackageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) );

          // Title testing
          {
            // We would be testing the English version(!)
            if ( !url.includes( '_en-phetio' ) ) {

              const partialPotentialTitleStringKey = `${repo}.title`;
              const fullPotentialTitleStringKey = `${repoPackageObject.phet.requirejsNamespace}/${partialPotentialTitleStringKey}`;

              const hasTitleKey = SKIP_TITLE_STRING_PATTERN ? true : await evaluate( url, `!!phet.chipper.strings.en[ "${fullPotentialTitleStringKey}" ]` );

              if ( hasTitleKey ) {
                const getTitle = async locale => evaluate( getUrlWithLocale( locale ), () => document.title, {

                  // PhET-iO Hydrogen sims won't have this behavior until the localeProperty has statically imported/loaded
                  waitForFunction: '(phet.joist?.sim && !phet.joist.sim.isConstructionCompleteProperty) || phet.joist?.sim?.isConstructionCompleteProperty.value'
                } );

                // null if could not be found
                const lookupSpecificTitleTranslation = locale => {
                  let json;
                  if ( locale === 'en' ) {
                    json = JSON.parse( fs.readFileSync( `../${repo}/${repo}-strings_en.json`, 'utf8' ) );
                  }
                  else {
                    try {
                      json = JSON.parse( fs.readFileSync( `../babel/${repo}/${repo}-strings_${locale}.json`, 'utf8' ) );
                    }
                    catch( e ) {
                      return null;
                    }
                  }
                  return json[ partialPotentialTitleStringKey ]?.value ?? null;
                };

                const lookupFallbackTitle = locale => {
                  const locales = [
                    locale,
                    ...( localeData[ locale ]?.fallbackLocales || [] ),
                    'en'
                  ];

                  for ( const testLocale of locales ) {
                    const title = lookupSpecificTitleTranslation( testLocale );
                    if ( title ) {
                      return title;
                    }
                  }

                  throw new Error( `could not compute fallback title for locale ${locale}` );
                };

                const checkTitle = async ( locale, lookupLocale ) => {
                  const actualTitle = await getTitle( locale );
                  const expectedTitle = lookupFallbackTitle( lookupLocale );

                  if ( actualTitle.trim().includes( expectedTitle.trim() ) ) {
                    return null;
                  }
                  else {
                    return `Actual title ${JSON.stringify( actualTitle )} does not match expected title ${JSON.stringify( expectedTitle )} for locale ${locale} / ${lookupLocale}`;
                  }
                };

                const esTitleError = await checkTitle( 'es', 'es' );
                logStatus( !esTitleError, `es title ${esTitleError}` );

                const spaTitleError = await checkTitle( 'spa', 'es' );
                logStatus( !spaTitleError, `spa title ${spaTitleError}` );

                const espyTitleError = await checkTitle( 'ES_PY', 'es_PY' );
                logStatus( !espyTitleError, `ES_PY title ${espyTitleError}` );
              }
              else {
                logResult( false, 'could not find title string key', url );
              }
            }
          }

          // QueryStringMachine.warnings testing
          {
            // boolean | null - null if warnings array not supported
            const getHasQSMWarning = async locale => evaluate(
              getUrlWithLocale( locale ),
              '( window.QueryStringMachine && QueryStringMachine.warnings !== undefined ) ? ( QueryStringMachine.warnings.length > 0 ) : null'
            );

            logStatus( !( await getHasQSMWarning( 'en' ) ), 'en QSM warning' );
            logStatus( !( await getHasQSMWarning( 'ES' ) ), 'ES QSM warning' );
            logStatus( !( await getHasQSMWarning( 'XX' ) ), 'XX QSM warning' );
            logStatus( !( await getHasQSMWarning( 'XX-wX' ) ), 'XX-wX QSM warning' );
            logStatus( ( await getHasQSMWarning( 'alkrtnalrc9SRTXX' ) ) !== false, 'nonsense QSM warning (expected)' );
          }

          const nonEnglishTranslationLocales = fs.readdirSync( `../${releaseBranchPath}babel/${repo}/` )
            .filter( file => file.startsWith( `${repo}-strings_` ) )
            .map( file => file.substring( file.indexOf( '_' ) + 1, file.lastIndexOf( '.' ) ) );

          const getSomeRandomTranslatedLocales = () => {
            return _.uniq(
              [
                'en',
                'es',
                ..._.sampleSize( nonEnglishTranslationLocales, 8 )
              ]
            );
          };

          const includedDataLocales = _.sortBy( _.uniq( [
            // Always include the fallback (en)
            'en',

            // Include directly-used locales
            ...nonEnglishTranslationLocales,

            // Include locales that will fall back to directly-used locales
            ...Object.keys( localeData ).filter( locale => {
              return localeData[ locale ].fallbackLocales && localeData[ locale ].fallbackLocales.some( fallbackLocale => {
                return nonEnglishTranslationLocales.includes( fallbackLocale );
              } );
            } )
          ] ) );

          // Check presence of included data locales
          {
            const dataLocaleCheck = await evaluate( getUrlWithLocale( 'en' ), `${JSON.stringify( includedDataLocales )}.every( locale => phet.chipper.localeData[ locale ] )` );

            logStatus( dataLocaleCheck, 'All included data locales present' );
          }

          // Locale-specific file testing (everything has _es)
          {
            if ( !url.includes( 'phet-io' ) && !url.includes( 'phetio' ) && url.includes( '/build/' ) ) {

              for ( const locale of getSomeRandomTranslatedLocales() ) {
                const specificURL = getLocaleSpecificURL( locale );
                const checkLocale = await evaluate( specificURL, () => phet.chipper.locale );

                logStatus( checkLocale === locale, `Locale-specific ${locale} build should be ${checkLocale}`, specificURL );
              }
            }
          }

          // Translation _all testing
          {
            for ( const locale of getSomeRandomTranslatedLocales() ) {
              logStatus( ( await getRunningLocale( locale ) ) === locale, `_all test for locale ${locale}` );
            }
          }
        }

        if ( TEST_ANALYTICS && url.includes( '/build/' ) ) {
          const plainURL = url;
          const plainAnalysis = analyzeURLs( await getLoadedURLs( plainURL ) );
          if ( !plainAnalysis.sentGoogleAnalytics ) {
            logResult( false, 'No Google Analytics sent', plainURL );
          }
          if ( !plainAnalysis.sentYotta ) {
            logResult( false, 'No yotta sent', plainURL );
          }

          const yottaFalseURL = `${url}&yotta=false`;
          const yottaFalseAnalysis = analyzeURLs( await getLoadedURLs( yottaFalseURL ) );
          if ( yottaFalseAnalysis.sentExternalRequest || yottaFalseAnalysis.sentGoogleAnalytics || yottaFalseAnalysis.sentYotta ) {
            logResult( false, 'yotta=false sent something', yottaFalseAnalysis );
          }

          const yottaSomeFlagURL = `${url}&${demoYottaQueryParameterKey}=${demoYottaQueryParameterValue}`;
          const yottaSomeFlagAnalysis = analyzeURLs( await getLoadedURLs( yottaSomeFlagURL ) );
          if ( !yottaSomeFlagAnalysis.hasDemoYottaQueryParameter ) {
            logResult( false, `No ${demoYottaQueryParameterKey}=${demoYottaQueryParameterValue} sent`, yottaSomeFlagAnalysis );
          }
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

      if ( TEST_PHET_IO_LOCALE && ( !releaseBranch || await releaseBranch.isPhetioHydrogen() ) ) {

        const testURLs = [
          `http://localhost:${port}/${releaseBranchPath}${repo}/build/phet-io/wrappers/studio/?`
        ];

        for ( const url of testURLs ) {

          // Wrong format locale should result in a error dialog and resulting locale to fall back to 'en'
          const fallbackLocale = await evaluate( `${url}&locale=es_PY`, () => new Promise( ( resolve, reject ) => {
              resolve( phetio.phetioClient.frame.contentWindow.phet.chipper.locale );
            } ), { waitForFunction: '!!phetio.phetioClient.simStarted' }
          );
          logResult( fallbackLocale === 'es', 'es fallback expected for non existent es_PY', `${url}&locale=es_PY` );

          // Wrong format locale should result in a error dialog and resulting locale to fall back to 'en'
          const emptyLocaleParam = await evaluate( `${url}&locale=`, () => new Promise( ( resolve, reject ) => {
              resolve( phetio.phetioClient.frame.contentWindow.phet.chipper.locale );
            } ), { waitForFunction: '!!phetio.phetioClient.simStarted' }
          );
          logResult( emptyLocaleParam === 'en', 'en fallback expected for empty locale in studio', `${url}&locale=` );

          // Wrong format locale should result in a error dialog and resulting locale to fall back to 'en'
          const badFormatLocaleParam = await evaluate( `${url}&locale=fdsa`, () => new Promise( ( resolve, reject ) => {
              resolve( phetio.phetioClient.frame.contentWindow.phet.chipper.locale );
            } ), { waitForFunction: '!!phetio.phetioClient.simStarted' }
          );
          logResult( badFormatLocaleParam === 'en', 'en fallback expected for badly formatted locale in studio', `${url}&locale=fdsa` );

          const standardWrapper = await evaluate( `${url}&exposeStandardPhetioWrapper`, () => new Promise( ( resolve, reject ) => {
            window.addEventListener( 'message', event => {
              if ( event.data.standardPhetioWrapper ) {
                resolve( event.data.standardPhetioWrapper );
              }
            } );

            window.phetioClient.invoke( `${phetio.PhetioClient.CAMEL_CASE_SIMULATION_NAME}.general.model.localeProperty`, 'setValue', [ 'de' ], () => {
              window.postMessage( { type: 'getStandardPhetioWrapper' }, '*' );
            } );
          } ), { waitForFunction: '!!window.phetioClient.simStarted' } );

          const parentDir = '../temp/release-branch-tests/';
          if ( !fs.existsSync( parentDir ) ) {
            fs.mkdirSync( parentDir, { recursive: true } );
          }

          const path = `temp/release-branch-tests/${repo}-standard-wrapper.html`;
          const filePath = `../${path}`;
          fs.writeFileSync( filePath, standardWrapper );

          const testLocale = async ( locale, expectedLocale, debug = true ) => {
            const standardWrapperURL = `http://localhost:${port}/${path}?${locale ? `locale=${locale}` : ''}&phetioDebug=${debug}`;
            const actualLocale = await evaluate( standardWrapperURL, () => new Promise( resolve => {
              setTimeout( () => {
                resolve( document.getElementById( 'sim' ).contentWindow.phet.chipper.locale );
              }, 1000 ); // wait for state to be set after loading
            } ), { waitForFunction: '!!window.phetioClient.simStarted' } );
            const success = actualLocale === expectedLocale;
            const message = `phet-io built locale ${locale} should be ${expectedLocale}`;
            logResult( success, message, standardWrapperURL );
          };

          await testLocale( null, 'de' );
          await testLocale( 'spa', 'es' );
          await testLocale( 'ES-py', 'es' );
          await testLocale( 'xx_pW', 'en' );
          await testLocale( 'artlakernt', 'en', false );

          fs.rmSync( filePath );
        }
      }
    }
  } );

  browser.close();
} )();