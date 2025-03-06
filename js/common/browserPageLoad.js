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

  return new Promise( async ( resolve, reject ) => { // eslint-disable-line no-async-promise-executor

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
      allowedTimeToLoad: 40000, // milliseconds for the whole thing to resolve and finish
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
      logLifeCycleOutput: true, // if true, log URL and LOAD logs
      logger: winston.info // {function(message)} pass in `console.log` if you are running in a context that doesn't use winston
    }, options );

    !options.resolveFromLoad && assert( options.onPageCreation, 'must resolve from onPageCreation' );

    const ownsBrowser = !options.browser;

    let browser;
    let page;
    let pageLoaded = false;

    // Keep track of if we have rejected an error. This makes sure we don't keep calling browser commands while
    // trying to clean up the page/browser and reject(). This is set to true BEFORE the cleanup(), which is async.
    let rejected = false;

    const cleanup = async () => {
      if ( page && !page.isClosed() ) {
        try {
          await page.close();
        }
        catch( e ) {
          /* puppeteer is bad at closing pages while still doing other stuff */
        }
      }

      // If we created a temporary browser, close it
      ownsBrowser && browser && await browser.close();
    };

    const localResolve = async result => {
      await cleanup();
      resolve( result );
    };
    const localReject = async error => {
      const wasRejected = rejected;
      rejected = true; // Before the async cleanup
      await cleanup();
      !wasRejected && reject( error ); // Otherwise, MK experienced  the second call's error getting provided to the Promise.
    };

    try {
      browser = options.browser || await browserCreator.launch( options.launchOptions );

      page = await browser.newPage();

      page.setCacheEnabled && page.setCacheEnabled( options.cachePages );

      await page.setDefaultNavigationTimeout( options.gotoTimeout );

      // The API for playwright was much more complicated, so just support puppeteer
      const username = process.env.BASIC_USERNAME;
      const password = process.env.BASIC_PASSWORD;

      if ( username && password ) {
        if ( browserCreator === puppeteer ) {
          // puppeteer has its own authentication method, thanks!
          await page.authenticate( {
            username: username,
            password: password
          } );
        }
        else {
          // Handle playwright browsers, see https://github.com/phetsims/aqua/issues/188

          // This is not the best method for puppeteer because it violated CORS policies, for example with console errors like:
          // [CONSOLE] Access to script at 'https://static.cloudflareinsights.com/beacon.min.js/v84a3a4012de94ce1a686ba8c167c359c1696973893317' from origin 'https:phet-io.colorado.edu' has been blocked by CORS policy: Request header field authorization is not allowed by Access-Control-Allow-Headers in preflight response.
          // [CONSOLE] Failed to load resource: net::ERR_FAILED:      https://static.cloudflareinsights.com/beacon.min.js/v84a3a4012de94ce1a686ba8c167c359c1696973893317
          // [CONSOLE] Access to fetch at 'https://phet.colorado.edu/services/metadata/phetio?latest=true&active=true' from origin 'https://phet-io.colorado.edu' has been blocked by CORS policy: Request header field authorization is not allowed by Access-Control-Allow-Headers in preflight response.
          // [CONSOLE] Failed to load resource: net::ERR_FAILED:      https://phet.colorado.edu/services/metadata/phetio?latest=true&active=true
          page.setExtraHTTPHeaders( {
              Authorization: `Basic ${Buffer.from( `${username}:${password}` ).toString( 'base64' )}`
            }
          );
        }
      }

      page.on( 'response', response => {
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
      page.on( 'console', msg => {
        let messageTxt = msg.text();

        // Append the location to messages that would benefit from it.
        if ( messageTxt.includes( 'net:' ) || messageTxt.includes( 'Failed to load resource' ) ) {
          messageTxt += `: \t ${msg.location().url}`;
        }

        if ( options.logConsoleOutput || ( msg.type() === 'error' && options.rejectPageErrors ) ) {
          options.logger( `[CONSOLE] ${messageTxt}` );
        }
      } );

      page.on( 'error', async message => {
        options.logger( `[ERROR] ${message}` );
        if ( options.rejectErrors ) {
          await localReject( new Error( message ) );
        }
      } );
      page.on( 'pageerror', async message => {
        options.logger( `[PAGE ERROR] ${message}` );
        if ( options.rejectPageErrors ) {
          await localReject( new Error( message ) );
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

      options.onPageCreation && await options.onPageCreation( page, localResolve, localReject );
      if ( rejected ) { return; }

      // Support puppeteer (evaluateOnNewDocument) or playwright (addInitScript)
      options.evaluateOnNewDocument && await ( ( page.evaluateOnNewDocument || page.addInitScript ).call( page, options.evaluateOnNewDocument ) );
      if ( rejected ) { return; }

      // Use timeout so that you can cancel it once we have a result. Node will wait for this if it is a orphaned Promise.
      const timeoutID = setTimeout( () => {
        options.onLoadTimeout( localResolve, localReject );
      }, options.allowedTimeToLoad );

      options.logLifeCycleOutput && options.logger( `[URL] ${url}` );

      // Await both at the same time, because all rejection is hooked up to the `promise`, but that could cause an error
      // during the goto call (not afterward), see https://github.com/phetsims/aqua/issues/197
      await page.goto( url, {
        timeout: options.gotoTimeout
      } );
      if ( rejected ) { return; }

      options.logLifeCycleOutput && options.logger( `[LOADED] ${url}` );
      pageLoaded = true;

      await sleep( options.waitAfterLoad );
      if ( rejected ) { return; }

      if ( options.waitForFunction ) {
        await page.waitForFunction( options.waitForFunction, {
          polling: 100, // default is every animation frame
          timeout: options.gotoTimeout
        } );
        if ( rejected ) { return; }
      }

      if ( options.resolveFromLoad ) {
        let result = null;
        if ( options.evaluate && !page.isClosed() ) {
          result = await page.evaluate( options.evaluate );
          if ( rejected ) { return; }
        }
        clearTimeout( timeoutID );
        localResolve( result );
      }
      else {
        clearTimeout( timeoutID );
      }
    }
    catch( e ) {
      options.logger( `browserPageLoad caught unexpected error: ${e}` );
      await localReject( e );
    }
  } );
};