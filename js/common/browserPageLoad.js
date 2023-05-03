// Copyright 2017-2022, University of Colorado Boulder

/**
 * Uses puppeteer to see whether a page loads without an error. Throws errors it receives
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const sleep = require( './sleep' );
const _ = require( 'lodash' );
const winston = require( 'winston' );

/**
 * Uses puppeteer to see whether a page loads without an error
 * @public
 *
 * Rejects if encountering an error loading the page OR (with option provided within the puppeteer page itself).
 *
 * @param {Browser} browserCreator - either `puppeteer` or a specific Browser from playright
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise.<null|*>} - The eval result/null
 */
module.exports = async function( browserCreator, url, options ) {

  options = _.merge( {

    // See https://github.com/puppeteer/puppeteer/blob/v14.1.1/docs/api.md#puppeteerlaunchoptions
    // Make sure to provide options that work with your browserCreator (playwright or puppeteer)
    launchOptions: {
      args: [
        '--disable-gpu'
      ]
    },

    browser: null, // {puppeteer.Browser|null} - If provided, we'll use a persistent browser

    evaluate: null, // {function|null}
    waitForFunction: null, // {string|null}

    rejectPageErrors: true, // reject when the page errors
    waitAfterLoad: 5000, // milliseconds
    allowedTimeToLoad: 40000, // milliseconds
    gotoTimeout: 30000, // milliseconds

    logConsoleOutput: false, // if true, this process will log all messages that come from page.on( 'console' )
    logNavigation: false, // if true, this process will log all messages that come from page.on( 'frame*' )
    logger: winston.info // pass in `console.log` if you are running in a context that doesn't use winston
  }, options );

  const ownsBrowser = !options.browser;

  let browser;
  let page;

  try {
    browser = options.browser || await browserCreator.launch( options.launchOptions );

    page = await browser.newPage();
    await page.setDefaultNavigationTimeout( options.gotoTimeout );

    // promote for use outside the closure
    let resolve;
    let reject;
    const promise = new Promise( ( res, rej ) => {
      resolve = res;
      reject = rej;
    } );

    let loaded = false;
    page.on( 'response', async response => {

      // 200 and 300 class status are most likely fine here
      if ( response.url() === url && response.status() >= 400 ) {
        options.logger( `Could not load from status: ${response.status()}` );
      }
    } );
    options.logConsoleOutput && page.on( 'console', msg => console.log( msg.text() ) );

    page.on( 'load', async () => {
      loaded = true;
      await sleep( options.waitAfterLoad );
      if ( options.waitForFunction ) {
        await page.waitForFunction( options.waitForFunction, {
          polling: 100, // default is every animation frame
          timeout: options.gotoTimeout
        } );
      }
      resolve( options.evaluate && !page.isClosed() ? await page.evaluate( options.evaluate ) : null );
    } );
    page.on( 'error', message => {
      options.logger( `puppeteer error: ${message}` );
      reject( new Error( message ) );
    } );
    page.on( 'pageerror', message => {
      if ( options.rejectPageErrors ) {
        options.logger( `puppeteer pageerror: ${message}` );
        reject( new Error( message ) );
      }
    } );
    if ( options.logNavigation ) {
      page.on( 'frameattached', async frame => {
        options.logger( 'attached', frame.url() );
      } );
      page.on( 'framedetached', async frame => {
        options.logger( 'detached', frame.url() );
      } );
      page.on( 'framenavigated', async frame => {
        options.logger( 'navigated', frame.url() );
      } );
    }
    ( async () => {
      await sleep( options.allowedTimeToLoad );
      if ( !loaded ) {
        options.logger( 'puppeteer not loaded' );
        reject( new Error( `Did not load in ${options.allowedTimeToLoad}` ) );
      }
    } )();
    await page.goto( url, {
      timeout: options.gotoTimeout
    } );
    const result = await promise;
    !page.isClosed() && await page.close();

    // If we created a temporary browser, close it
    ownsBrowser && await browser.close();

    return result;
  }

  catch( e ) {
    page && !page.isClosed() && await page.close();
    ownsBrowser && await browser.close();
    throw e;
  }
};
