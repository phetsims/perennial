// Copyright 2017-2022, University of Colorado Boulder

/**
 * Uses a browser to see whether a page loads without an error. Throws errors it receives.
 *
 * Supports multiple supported browsers from puppeteer and playwright. Must provide a browserCreator from either with a
 * `launch()` interface.
 * There are now many more features of this class. It is best to see its functionality by looking at options.
 *
 * To support authentication, we use process.env.BASIC_PASSWORD and process.env.BASIC_USERNAME, set those before calling
 * this function.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const sleep = require( './sleep' );
const _ = require( 'lodash' );
const winston = require( 'winston' );
const puppeteer = require( 'puppeteer' );
const assert = require( 'assert' );

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
  let pageLoaded = false;
  options = _.merge( {

    // See https://github.com/puppeteer/puppeteer/blob/v14.1.1/docs/api.md#puppeteerlaunchoptions
    // Make sure to provide options that work with your browserCreator (playwright or puppeteer)
    launchOptions: {
      args: [
        '--disable-gpu'
      ]
    },

    browser: null, // If provided, browserCreator is not used to create a browser, and this browser is not closed.

    evaluate: null, // {function|null}
    waitForFunction: null, // {string|null}

    rejectPageErrors: true, // reject when the page errors
    rejectErrors: true, // reject when there is an error with the browser

    // By default, once loaded we resolve, but opt out of this here. If you set to false, you must resolve in custom logic in onPageCreation
    resolveFromLoad: true,
    waitAfterLoad: 5000, // milliseconds
    allowedTimeToLoad: 40000, // milliseconds
    gotoTimeout: 30000, // milliseconds

    // Callback when logic is not complete after timeout of length: allowedTimeToLoad.
    onLoadTimeout: ( resolve, reject ) => {
      if ( !pageLoaded ) {
        options.logger( 'puppeteer page not loaded' );
        reject( new Error( `Did not load in ${options.allowedTimeToLoad}` ) );
      }
    },
    onPageCreation: null, // {function(page, resolve,reject):Promise<void>|null} - any extra items you want to do with the page before goto is called
    evaluateOnNewDocument: null, // {function|null} page.evaluateOnNewDocument for puppeteer, and addInitScript for playwrite

    cachePages: true,
    logConsoleOutput: false, // if true, this process will log all messages that come from page.on( 'console' )
    logNavigation: false, // if true, this process will log all messages that come from page.on( 'frame*' )
    logger: winston.info // {function(message)} pass in `console.log` if you are running in a context that doesn't use winston
  }, options );

  !options.resolveFromLoad && assert( options.onPageCreation, 'must resolve from onPageCreation' );

  const ownsBrowser = !options.browser;

  let browser;
  let page;

  const cleanup = async () => {
    page && !page.isClosed() && await page.close();

    // If we created a temporary browser, close it
    ownsBrowser && browser && await browser.close();
  };

  try {
    browser = options.browser || await browserCreator.launch( options.launchOptions );

    page = await browser.newPage();

    page.setCacheEnabled && page.setCacheEnabled( options.cachePages );

    await page.setDefaultNavigationTimeout( options.gotoTimeout );

    // The API for playwright was much more complicated, so just support puppeteer
    if ( !options.browser && browserCreator === puppeteer &&
         process.env.BASIC_PASSWORD && process.env.BASIC_USERNAME ) {
      await page.authenticate( { username: process.env.BASIC_USERNAME, password: process.env.BASIC_PASSWORD } );
    }

    // promote for use outside the closure
    let resolve;
    let reject;
    const promise = new Promise( ( res, rej ) => {
      resolve = res;
      reject = rej;
    } );

    page.on( 'response', async response => {
      const responseStatus = response.status();

      // 200 and 300 class status are most likely fine here
      if ( responseStatus >= 400 ) {
        const responseURL = response.url();
        if ( responseURL === url ) {
          options.logger( `[ERROR] Could not load from status: ${responseStatus}` );
        }
        else if ( responseStatus !== 404 ) { // There will be lots of 404 errors, like for strings files that don't exist
          options.logger( `[ERROR] Could not load dependency from status: ${responseStatus}, url: ${responseURL}` );
        }
      }
    } );
    options.logConsoleOutput && page.on( 'console', msg => {
      let messageTxt = msg.text();

      // Append the location to messages that would benefit from it.
      if ( messageTxt.includes( 'net:' ) || messageTxt.includes( 'Failed to load resource' ) ) {
        messageTxt += `: \t ${msg.location().url}`;
      }
      options.logger( `[CONSOLE] ${messageTxt}` );
    } );

    page.on( 'load', async () => {
      pageLoaded = true;
      await sleep( options.waitAfterLoad );
      if ( options.waitForFunction ) {
        await page.waitForFunction( options.waitForFunction, {
          polling: 100, // default is every animation frame
          timeout: options.gotoTimeout
        } );
      }
      options.resolveFromLoad && resolve( options.evaluate && !page.isClosed() ? await page.evaluate( options.evaluate ) : null );
    } );

    options.onPageCreation && await options.onPageCreation( page, resolve, reject );

    // Support puppeteer (evaluateOnNewDocument) or playwright (addInitScript)
    options.evaluateOnNewDocument && await ( ( page.evaluateOnNewDocument || page.addInitScript ).call( page, options.evaluateOnNewDocument ) );


    page.on( 'error', message => {
      options.logger( `[ERROR] ${message}` );
      if ( options.rejectErrors ) {
        reject( new Error( message ) );
      }
    } );
    page.on( 'pageerror', message => {
      options.logger( `[PAGE ERROR] ${message}` );
      if ( options.rejectPageErrors ) {
        reject( new Error( message ) );
      }
    } );
    if ( options.logNavigation ) {
      page.on( 'frameattached', async frame => {
        options.logger( `[ATTACHED] ${frame.url()}` );
      } );
      page.on( 'framedetached', async frame => {
        options.logger( `[DETACHED] ${frame.url()}` );
      } );
      page.on( 'framenavigated', async frame => {
        options.logger( `[NAVIGATED] ${frame.url()}` );
      } );
    }

    // Use timeout so that you can cancel it once we have a result. Node will wait for this if it is a orphaned Promise.
    const timeoutID = setTimeout( () => {
      options.onLoadTimeout( resolve, reject );
    }, options.allowedTimeToLoad );

    options.logger( `[URL] ${url}` );

    let result = null;

    // Await both at the same time, because all rejection is hooked up to the `promise`, but that could cause an error
    // during the goto call (not afterward), see https://github.com/phetsims/aqua/issues/197
    await Promise.all( [
      page.goto( url, {
        timeout: options.gotoTimeout
      } ),
      promise.then( myResult => { result = myResult;} )
    ] );

    await cleanup();
    clearTimeout( timeoutID );
    return result;
  }

  catch( e ) {
    options.logger( e );
    await cleanup();
    throw e;
  }
};
