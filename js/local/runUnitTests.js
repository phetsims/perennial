/* eslint-disable */
// Adapted from https://github.com/davidtaylorhq/qunit-puppeteer which is distributed under the MIT License // eslint-disable-line
/* eslint-enable */

module.exports = function( browser, targetURL ) {
  'use strict';

  return new Promise( async function( resolve, reject ) {
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

    // Output log
    // page.on( 'console', msg => console.log( 'PAGE LOG:', msg.text() ) );

    var moduleErrors = [];
    var testErrors = [];
    var assertionErrors = [];

    await page.exposeFunction( 'harness_moduleDone', context => {
      if ( context.failed ) {
        var msg = 'Module Failed: ' + context.name + '\n' + testErrors.join( '\n' );
        moduleErrors.push( msg );
        testErrors = [];
      }
    } );

    await page.exposeFunction( 'harness_testDone', context => {
      if ( context.failed ) {
        var msg = '  Test Failed: ' + context.name + assertionErrors.join( '    ' );
        testErrors.push( msg );
        assertionErrors = [];
        process.stdout.write( 'F' );
      }
      else {
        // process.stdout.write( '.' );
      }
    } );

    await page.exposeFunction( 'harness_log', context => {
      if ( context.result ) { return; } // If success don't log

      var msg = '\n    Assertion Failed:';
      if ( context.message ) {
        msg += ' ' + context.message;
      }

      if ( context.expected ) {
        msg += '\n      Expected: ' + context.expected + ', Actual: ' + context.actual;
      }

      assertionErrors.push( msg );
    } );

    await page.exposeFunction( 'harness_done', async function( context ) {
      // console.log( '\n' );

      if ( moduleErrors.length > 0 ) {
        for ( var idx = 0; idx < moduleErrors.length; idx++ ) {
          console.error( moduleErrors[ idx ] + '\n' );
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
      await page.goto( targetURL );

      await page.evaluate( () => {
        QUnit.config.testTimeout = 10000;

        // Cannot pass the window.harness_blah methods directly, because they are
        // automatically defined as async methods, which QUnit does not support
        QUnit.moduleDone( context => window.harness_moduleDone( context ) );
        QUnit.testDone( context => window.harness_testDone( context ) );
        QUnit.log( context => window.harness_log( context ) );
        QUnit.done( context => window.harness_done( context ) );
      } );
    }
    catch( e ) {
      end( { ok: false, message: 'caught exception ' + e } );
    }
  } );
};