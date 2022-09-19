/* eslint-disable */
// Adapted from https://github.com/davidtaylorhq/qunit-puppeteer which is distributed under the MIT License
/* eslint-enable */


module.exports = function( browser, targetURL ) {

  return new Promise( async ( resolve, reject ) => { // eslint-disable-line no-async-promise-executor
    const page = await browser.newPage();
    let ended = false;
    const end = async function( result ) {
      if ( !ended ) {
        ended = true;
        await page.close();
        resolve( result );
      }
    };

    page.on( 'error', msg => end( { ok: false, result: 'error', message: msg } ) );
    page.on( 'pageerror', msg => end( { ok: false, result: 'pageerror', message: msg } ) );

    const moduleErrors = [];
    let testErrors = [];
    let assertionErrors = [];

    await page.exposeFunction( 'harness_moduleDone', context => {
      if ( context.failed ) {
        const msg = `Module Failed: ${context.name}\n${testErrors.join( '\n' )}`;
        moduleErrors.push( msg );
        testErrors = [];
      }
    } );

    await page.exposeFunction( 'harness_testDone', context => {
      if ( context.failed ) {
        const msg = `  Test Failed: ${context.name}${assertionErrors.join( '    ' )}`;
        testErrors.push( msg );
        assertionErrors = [];
        process.stdout.write( 'F' );
      }
      else {
        // process.stdout.write( '.' );
      }
    } );

    await page.exposeFunction( 'harness_log', ( passed, message, source ) => {
      if ( passed ) { return; } // If success don't log

      let msg = '\n    Assertion Failed:';
      if ( message ) {
        msg += ` ${message}`;
      }

      if ( source ) {
        msg += `\n\n${source}`;
      }

      assertionErrors.push( msg );
    } );

    await page.exposeFunction( 'harness_done', async context => {
      // console.log( '\n' );

      if ( moduleErrors.length > 0 ) {
        for ( let idx = 0; idx < moduleErrors.length; idx++ ) {
          console.error( `${moduleErrors[ idx ]}\n` );
        }
      }

      end( {
        ok: context.passed === context.total,
        time: context.runtime,
        totalTests: context.total,
        passed: context.passed,
        failed: context.failed,
        errors: moduleErrors
      } );
    } );

    try {
      if ( targetURL.indexOf( '?' ) === -1 ) {
        throw new Error( 'URL should have query parameters' );
      }
      await page.goto( `${targetURL}&qunitHooks` );

      await page.evaluate( () => {

        const launch = () => {
          QUnit.config.testTimeout = 10000;

          // Cannot pass the window.harness_blah methods directly, because they are
          // automatically defined as async methods, which QUnit does not support
          QUnit.moduleDone( context => window.harness_moduleDone( context ) );
          QUnit.testDone( context => window.harness_testDone( context ) );

          // This context could contain objects that can't be sent over to harness_log, so just take the parts we need.
          QUnit.log( context => window.harness_log( context.result, context.message, context.source ) );
          QUnit.done( context => window.harness_done( context ) );

          // Launch the qunit tests now that listeners are wired up
          window.qunitLaunchAfterHooks();
        };

        // Start right away if the page is ready
        if ( window.qunitLaunchAfterHooks ) {
          launch();
        }
        else {

          // Polling to wait until the page is ready for launch
          let id = null;
          id = setInterval( () => {
            if ( window.qunitLaunchAfterHooks ) {
              clearInterval( id );
              launch();
            }
          }, 16 );
        }
      } );
    }
    catch( e ) {
      end( { ok: false, message: `caught exception ${e}` } );
    }
  } );
};