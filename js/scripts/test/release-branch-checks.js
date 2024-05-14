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
const fs = require( 'fs' );

winston.default.transports.console.level = 'error';

const TEST_LOCALES = true;
const TEST_ANALYTICS = false;

const localeData = JSON.parse( fs.readFileSync( '../babel/localeData.json', 'utf8' ) );

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

      const getUrlWithLocale = locale => url.includes( '?' ) ? `${url}&locale=${locale}` : `${url}?locale=${locale}`;
      const getLocaleSpecificURL = locale => url.replace( '_all', `_${locale}` );

      if ( TEST_LOCALES ) {
        // TODO: test unbuilt locales (https://github.com/phetsims/joist/issues/963)

        // Check locale MR. es_PY should always be in localeData
        const localeValues = await puppeteerLoad( url, {
          evaluate: () => {
            return [ !!phet.chipper.localeData, !!( phet.chipper.localeData?.es_PY ) ];
          },
          gotoTimeout: 60000,
          waitAfterLoad: 2000,
          browser: browser
        } );
        if ( !localeValues[ 0 ] ) {
          console.log( '  no localeData' );
        }
        if ( !localeValues[ 1 ] ) {
          console.log( '  no es_PY localeData' );
        }

        const getRunningLocale = async locale => {
          try {
            return await puppeteerLoad( getUrlWithLocale( locale ), {
              evaluate: () => {
                return phet.chipper.locale;
              },
              gotoTimeout: 60000,
              waitAfterLoad: 2000,
              browser: browser
            } );
          }
          catch( e ) {
            console.log( `  error running with locale=${locale}` );
            return 'error';
          }
        };

        const esLocale = await getRunningLocale( 'es' );
        if ( esLocale !== 'es' ) {
          console.log( '  es locale not es' );
        }

        const spaLocale = await getRunningLocale( 'spa' );
        if ( spaLocale !== 'es' ) {
          console.log( '  spa locale not es' );
        }

        const espyLocale = await getRunningLocale( 'ES_PY' );
        if ( espyLocale !== 'es' && espyLocale !== 'es_PY' ) {
          console.log( '  ES_PY locale not es/es_PY' );
        }

        const invalidLocale = await getRunningLocale( 'aenrtpyarntSRTS' );
        if ( invalidLocale !== 'en' ) {
          console.log( '  invalid locale issue, not en' );
        }

        const repoPackageObject = JSON.parse( fs.readFileSync( `../${releaseBranch.repo}/package.json`, 'utf8' ) );

        const partialPotentialTitleStringKey = `${releaseBranch.repo}.title`;
        const fullPotentialTitleStringKey = `${repoPackageObject.phet.requirejsNamespace}/${partialPotentialTitleStringKey}`;

        const hasTitleKey = await puppeteerLoad( url, {
          evaluate: `!!phet.chipper.strings.en[ "${fullPotentialTitleStringKey}" ]`,
          gotoTimeout: 60000,
          waitAfterLoad: 2000,
          browser: browser
        } );

        if ( hasTitleKey ) {
          const getTitle = async locale => {
            try {
              return await puppeteerLoad( getUrlWithLocale( locale ), {
                evaluate: () => {
                  return document.title;
                },
                gotoTimeout: 60000,
                waitAfterLoad: 2000,
                browser: browser
              } );
            }
            catch( e ) {
              console.log( `  error running with locale=${locale}` );
              return 'error';
            }
          };

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

            if ( actualTitle.includes( expectedTitle ) ) {
              return null;
            }
            else {
              return `Actual title ${JSON.stringify( actualTitle )} does not match expected title ${JSON.stringify( expectedTitle )} for locale ${locale} / ${lookupLocale}`;
            }
          };

          const esTitleError = await checkTitle( 'es', 'es' );
          if ( esTitleError ) {
            console.log( `  es title error: ${esTitleError}` );
          }

          const spaTitleError = await checkTitle( 'spa', 'es' );
          if ( spaTitleError ) {
            console.log( `  spa title error: ${spaTitleError}` );
          }

          const espyTitleError = await checkTitle( 'ES_PY', 'es_PY' );
          if ( espyTitleError ) {
            console.log( `  ES_PY title error: ${espyTitleError}` );
          }
        }
        else {
          console.log( '    (could not find title string key)' );
        }

        // QueryStringMachine.warnings testing
        {
          // boolean | null - null if warnings array not supported
          const getHasQSMWarning = async locale => puppeteerLoad( getUrlWithLocale( locale ), {
            evaluate: 'QueryStringMachine.warnings !== undefined ? ( QueryStringMachine.warnings.length > 0 ) : null',
            gotoTimeout: 60000,
            waitAfterLoad: 2000,
            browser: browser
          } );

          if ( await getHasQSMWarning( 'en' ) ) {
            console.log( '  en has QSM warning' );
          }

          if ( await getHasQSMWarning( 'ES' ) ) {
            console.log( '  ES has QSM warning' );
          }

          if ( await getHasQSMWarning( 'XX' ) ) {
            console.log( '  XX has QSM warning' );
          }

          if ( await getHasQSMWarning( 'XX-wX' ) ) {
            console.log( '  XX-wX has QSM warning' );
          }

          const hasQSMNonsenseWarning = await getHasQSMWarning( 'alkrtnalrc9SRTXX' );
          if ( hasQSMNonsenseWarning === false ) {
            console.log( '  missing nonsense QSM warning' );
          }
        }

        // Locale-specific file testing (everything has _es)
        {
          const esSpecificLocale = await puppeteerLoad( getLocaleSpecificURL( 'es' ), {
            evaluate: () => {
              return phet.chipper.locale;
            },
            gotoTimeout: 60000,
            waitAfterLoad: 2000,
            browser: browser
          } );

          if ( esSpecificLocale !== 'es' ) {
            console.log( '  _es.html locale not es' );
          }
        }
      }

      if ( TEST_ANALYTICS ) {
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