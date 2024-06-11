// Copyright 2024, University of Colorado Boulder

/**
 * Checking yotta=false (https://github.com/phetsims/phetcommon/issues/65) and yotta*=*
 * (https://github.com/phetsims/phetcommon/issues/66) behavior on non-refreshed release branches.
 *
 * NOTE: refresh release branches if not doing an active MR.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const _ = require( 'lodash' );
const puppeteerLoad = require( '../../common/puppeteerLoad' );
const Maintenance = require( '../../common/Maintenance' );
const winston = require( 'winston' );
const puppeteer = require( 'puppeteer' );
const fs = require( 'fs' );

winston.default.transports.console.level = 'error';

const VERBOSE_LOG_SUCCESS = true;
const TEST_LOCALES = true;
const TEST_ANALYTICS = false;

const SKIP_TITLE_STRING_PATTERN = true;

const localeData = JSON.parse( fs.readFileSync( '../babel/localeData.json', 'utf8' ) );

( async () => {
  const browser = await puppeteer.launch( {
    args: [
      '--disable-gpu'
    ]
  } );

  const getBuiltURLs = async releaseBranch => {
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

  const getUnbuiltURLs = async releaseBranch => {
    const urls = [
      `http://localhost/release-branches/${releaseBranch.repo}-${releaseBranch.branch}/${releaseBranch.repo}/${releaseBranch.repo}_en.html?webgl=false`
    ];

    if ( releaseBranch.brands.includes( 'phet-io' ) ) {
      const standaloneParams = await releaseBranch.getPhetioStandaloneQueryParameter();
      urls.push( `http://localhost/release-branches/${releaseBranch.repo}-${releaseBranch.branch}/${releaseBranch.repo}/${releaseBranch.repo}_en.html?webgl=false&${standaloneParams}&brand=phet-io` );
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

  const evaluate = async ( url, evaluate ) => {
    try {
      return await puppeteerLoad( url, {
        evaluate: evaluate,
        gotoTimeout: 60000,
        waitAfterLoad: 2000,
        browser: browser
      } );
    }
    catch( e ) {
      console.log( `  error running ${url}` );
      return 'error';
    }
  };

  for ( const releaseBranch of await Maintenance.loadAllMaintenanceBranches() ) {
    console.log( releaseBranch.toString() );

    // if ( releaseBranch.repo < 'gravity-force-lab' ) {
    //   console.log( 'skip!' );
    //   continue;
    // }

    const urls = await getAllURLs( releaseBranch );

    for ( const url of urls ) {

      // Because `planet` and `planet.controls.title` keys present in translations OVERLAP in the string object created by
      // getStringModule, and FAILS hard on these. Built versions work ok.
      if ( releaseBranch.repo === 'gravity-force-lab' && releaseBranch.branch === '2.2' && url.includes( '_en.html' ) ) {
        console.log( ' skipping gravity-force-lab 2.2 unbuilt, since planet / planet.controls.title strings in translations will not run in unbuilt mode' );
        continue;
      }
      if ( releaseBranch.repo === 'gravity-force-lab-basics' && releaseBranch.branch === '1.1' && url.includes( '_en.html' ) ) {
        console.log( ' skipping gravity-force-lab 2.2 unbuilt, since planet / planet.controls.title strings in translations will not run in unbuilt mode' );
        continue;
      }

      const getUrlWithLocale = locale => url.includes( '?' ) ? `${url}&locale=${locale}` : `${url}?locale=${locale}`;
      const getLocaleSpecificURL = locale => url.replace( '_all', `_${locale}` );

      const logPass = message => {
        if ( VERBOSE_LOG_SUCCESS ) {
          console.log( `      [OK] ${message} URL: ${url}` );
        }
      };

      const logFailure = message => {
        console.log( `  [FAIL] ${message} URL: ${url}` );
      };

      const logStatus = ( status, message ) => {
        if ( status ) {
          logPass( message );
        }
        else {
          logFailure( message );
        }
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
        logStatus( armaLocale === 'ar' || armaLocale === 'ar_SA' || armaLocale === 'ar_MA', 'ar_SA phet.chipper.locale' );

        const invalidLocale = await getRunningLocale( 'aenrtpyarntSRTS' );
        logStatus( invalidLocale === 'en', 'nonsense phet.chipper.locale' );

        if ( url.includes( '/build/' ) ) {
          const puLocale = await getRunningLocale( 'pu' );
          logStatus( puLocale === 'pu', 'pu phet.chipper.locale (custom test)' );
        }

        const repoPackageObject = JSON.parse( fs.readFileSync( `../${releaseBranch.repo}/package.json`, 'utf8' ) );

        // Title testing
        {
          // We would be testing the English version(!)
          if ( !url.includes( '_en-phetio' ) ) {

            const partialPotentialTitleStringKey = `${releaseBranch.repo}.title`;
            const fullPotentialTitleStringKey = `${repoPackageObject.phet.requirejsNamespace}/${partialPotentialTitleStringKey}`;

            const hasTitleKey = SKIP_TITLE_STRING_PATTERN ? true : await evaluate( url, `!!phet.chipper.strings.en[ "${fullPotentialTitleStringKey}" ]` );

            if ( hasTitleKey ) {
              const getTitle = async locale => evaluate( getUrlWithLocale( locale ), () => document.title );

              // null if could not be found
              const lookupSpecificTitleTranslation = locale => {
                let json;
                if ( locale === 'en' ) {
                  json = JSON.parse( fs.readFileSync( `../${releaseBranch.repo}/${releaseBranch.repo}-strings_en.json`, 'utf8' ) );
                }
                else {
                  try {
                    json = JSON.parse( fs.readFileSync( `../babel/${releaseBranch.repo}/${releaseBranch.repo}-strings_${locale}.json`, 'utf8' ) );
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
              logFailure( 'could not find title string key' );
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

        const nonEnglishTranslationLocales = fs.readdirSync( `../release-branches/${releaseBranch.repo}-${releaseBranch.branch}/babel/${releaseBranch.repo}/` )
          .filter( file => file.startsWith( `${releaseBranch.repo}-strings_` ) )
          .map( file => file.substring( file.indexOf( '_' ) + 1, file.lastIndexOf( '.' ) ) );

        const getSomeRandomTranslatedLocales = () => {
          return _.uniq(
            [
              'en',
              'es',
              'pu',
              ..._.sampleSize( nonEnglishTranslationLocales, 8 )
            ]
          ).filter( locale => {
            return url.includes( '/build/' ) ? true : locale !== 'pu';
          } );
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
              const checkLocale = await evaluate( getLocaleSpecificURL( locale ), () => phet.chipper.locale );

              logStatus( checkLocale === locale, `Locale-specific ${locale} build should be ${checkLocale}` );
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
          logFailure( 'No Google Analytics sent', plainURL );
        }
        if ( !plainAnalysis.sentYotta ) {
          logFailure( 'No yotta sent', plainURL );
        }

        const yottaFalseURL = `${url}&yotta=false`;
        const yottaFalseAnalysis = analyzeURLs( await getLoadedURLs( yottaFalseURL ) );
        if ( yottaFalseAnalysis.sentExternalRequest || yottaFalseAnalysis.sentGoogleAnalytics || yottaFalseAnalysis.sentYotta ) {
          logFailure( 'yotta=false sent something', yottaFalseAnalysis );
        }

        const yottaSomeFlagURL = `${url}&${demoYottaQueryParameterKey}=${demoYottaQueryParameterValue}`;
        const yottaSomeFlagAnalysis = analyzeURLs( await getLoadedURLs( yottaSomeFlagURL ) );
        if ( !yottaSomeFlagAnalysis.hasDemoYottaQueryParameter ) {
          logFailure( `No ${demoYottaQueryParameterKey}=${demoYottaQueryParameterValue} sent`, yottaSomeFlagAnalysis );
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
  }

  browser.close();
} )();