// Copyright 2017-2026, University of Colorado Boulder

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
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { sleep } from './async/sleep.js';
import _ from 'lodash';
import winston from 'winston';
import puppeteer from 'puppeteer';
import type { Browser as PuppeteerBrowser, ConsoleMessage as PuppeteerConsoleMessage, Frame as PuppeteerFrame, HTTPResponse as PuppeteerHTTPResponse, Page as PuppeteerPage, PuppeteerLaunchOptions } from 'puppeteer';
import assert from 'assert';
import type { Browser as PlaywrightBrowser, BrowserType as PlaywrightBrowserType, ConsoleMessage as PlaywrightConsoleMessage, Frame as PlaywrightFrame, LaunchOptions as PlaywrightLaunchOptions, Page as PlaywrightPage, Response as PlaywrightResponse } from 'playwright';

type Browser = PuppeteerBrowser | PlaywrightBrowser;
type Page = PuppeteerPage | PlaywrightPage;
type PuppeteerBrowserCreator = typeof puppeteer;
type BrowserCreator = PuppeteerBrowserCreator | PlaywrightBrowserType;
type LaunchOptions = PuppeteerLaunchOptions | PlaywrightLaunchOptions;
type PageLoadResolve = ( result: unknown ) => void;
type PageLoadReject = ( error: unknown ) => void;
type PageCallback<TPage extends Page> = ( page: TPage, resolve: PageLoadResolve, reject: PageLoadReject ) => Promise<void> | void;
type PageFunction = string | ( ( ...args: unknown[] ) => unknown );

type BrowserPageLoadOptionsBase<TPage extends Page, TBrowser extends Browser, TLaunchOptions extends LaunchOptions, TBrowserCreator extends BrowserCreator = BrowserCreator> = {
  // See https://github.com/puppeteer/puppeteer/blob/v14.1.1/docs/api.md#puppeteerlaunchoptions
  // Make sure to provide options that work with your browserCreator (playwright or puppeteer)
  launchOptions: TLaunchOptions;

  // If provided, browserCreator is not used to create a browser, and this browser is not closed.
  browser: TBrowser | null;
  evaluate: PageFunction | null;
  waitForFunction: PageFunction | null;

  // reject when the page errors
  rejectPageErrors: boolean;

  // reject when there is an error with the browser
  rejectErrors: boolean;

  // By default, once loaded we resolve, but opt out of this here. If you set to false, you must resolve in custom logic in onPageCreation
  resolveFromLoad: boolean;

  waitAfterLoad: number; // milliseconds
  allowedTimeToLoad: number; // milliseconds for the whole thing to resolve and finish
  gotoTimeout: number; // milliseconds

  // Callback when logic is not complete after timeout of length: allowedTimeToLoad.
  onLoadTimeout: ( resolve: PageLoadResolve, reject: PageLoadReject ) => void;

  // any extra items you want to do with the page before goto is called
  onPageCreation: PageCallback<TPage> | null;

  // page.evaluateOnNewDocument for puppeteer, and addInitScript for playwright
  evaluateOnNewDocument: PageFunction | null;

  cachePages: boolean;

  // if true, this process will log all messages that come from page.on( 'console' )
  logConsoleOutput: boolean;

  // if true, this process will log all messages that come from page.on( 'frame*' )
  logNavigation: boolean;

  // if true, log URL and LOAD logs
  logLifeCycleOutput: boolean;

  // pass in `console.log` if you are running in a context that doesn't use winston
  logger: ( message: string ) => void;

  testingBrowserCreator: TBrowserCreator;
};

export type BrowserPageLoadOptions<
  TPage extends Page = Page,
  TBrowser extends Browser = Browser,
  TLaunchOptions extends LaunchOptions = LaunchOptions,
  TBrowserCreator extends BrowserCreator = BrowserCreator
> = Partial<BrowserPageLoadOptionsBase<TPage, TBrowser, TLaunchOptions, TBrowserCreator>>;

export type PuppeteerBrowserPageLoadOptions = BrowserPageLoadOptions<PuppeteerPage, PuppeteerBrowser, PuppeteerLaunchOptions, PuppeteerBrowserCreator>;
export type PlaywrightBrowserPageLoadOptions = BrowserPageLoadOptions<PlaywrightPage, PlaywrightBrowser, PlaywrightLaunchOptions, PlaywrightBrowserType>;

/**
 * Uses puppeteer to see whether a page loads without an error
 * Rejects if encountering an error loading the page OR (with option provided within the puppeteer page itself).
 *
 * @param browserCreator - either `puppeteer` or a specific Browser from playwright
 * @param url
 * @param options
 * @returns The eval result/null
 */
export function browserPageLoad( browserCreator: PuppeteerBrowserCreator, url: string, options?: PuppeteerBrowserPageLoadOptions ): Promise<unknown>;
export function browserPageLoad( browserCreator: PlaywrightBrowserType, url: string, options?: PlaywrightBrowserPageLoadOptions ): Promise<unknown>;
export async function browserPageLoad( browserCreator: BrowserCreator, url: string, providedOptions?: PuppeteerBrowserPageLoadOptions | PlaywrightBrowserPageLoadOptions ): Promise<unknown> {

  return new Promise( async ( resolve, reject ) => { // eslint-disable-line no-async-promise-executor

    const options: BrowserPageLoadOptionsBase<Page, Browser, LaunchOptions> = _.merge( {
      launchOptions: {
        args: [
          '--disable-gpu'
        ]
      },

      browser: null,
      evaluate: null,
      waitForFunction: null,
      rejectPageErrors: true,
      rejectErrors: true,
      resolveFromLoad: true,
      waitAfterLoad: 5000,
      allowedTimeToLoad: 40000,
      gotoTimeout: 30000,

      onLoadTimeout: ( resolve: PageLoadResolve, reject: PageLoadReject ) => {
        if ( !pageLoaded ) {
          options.logger( 'puppeteer page not loaded' );
          reject( new Error( `Did not load in ${options.allowedTimeToLoad}` ) );
        }
      },
      onPageCreation: null,
      evaluateOnNewDocument: null,
      cachePages: true,
      logConsoleOutput: false,
      logNavigation: false,
      logLifeCycleOutput: true,
      logger: winston.info,
      testingBrowserCreator: browserCreator
    }, providedOptions );

    !options.resolveFromLoad && assert( options.onPageCreation, 'must resolve from onPageCreation' );

    const ownsBrowser = !options.browser;

    let browser: Browser;
    let page: Page;
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

    const localResolve = async ( result: unknown ) => {
      await cleanup();
      resolve( result );
    };
    const localReject = async ( error: unknown ) => {
      const wasRejected = rejected;
      rejected = true; // Before the async cleanup
      await cleanup();
      !wasRejected && reject( error ); // Otherwise, MK experienced  the second call's error getting provided to the Promise.
    };

    try {
      browser = options.browser || await launchBrowser( browserCreator, options.launchOptions );

      page = await browser.newPage();

      if ( isPuppeteerPage( page ) ) {
        await page.setCacheEnabled( options.cachePages );
      }

      page.setDefaultNavigationTimeout( options.gotoTimeout );

      // The API for playwright was much more complicated, so just support puppeteer
      const username = process.env.BASIC_USERNAME;
      const password = process.env.BASIC_PASSWORD;

      if ( username && password ) {
        if ( isPuppeteerBrowserCreator( browserCreator ) && isPuppeteerPage( page ) ) {
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
          await page.setExtraHTTPHeaders( {
              Authorization: `Basic ${Buffer.from( `${username}:${password}` ).toString( 'base64' )}`
            }
          );
        }
      }

      if ( isPuppeteerPage( page ) ) {
        addPuppeteerPageListeners( page, url, options, localReject );
      }
      else {
        addPlaywrightPageListeners( page, url, options, localReject );
      }

      options.onPageCreation && await options.onPageCreation( page, localResolve, localReject );
      if ( rejected ) { return; }

      // Support puppeteer (evaluateOnNewDocument) or playwright (addInitScript)
      if ( options.evaluateOnNewDocument ) {
        if ( isPuppeteerPage( page ) ) {
          await page.evaluateOnNewDocument( options.evaluateOnNewDocument );
        }
        else {
          await page.addInitScript( options.evaluateOnNewDocument );
        }
      }
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
        if ( isPuppeteerPage( page ) ) {
          await page.waitForFunction( options.waitForFunction, {
            polling: 100, // default is every animation frame
            timeout: options.gotoTimeout
          } );
        }
        else {
          await page.waitForFunction( options.waitForFunction, {
            polling: 100, // default is every animation frame
            timeout: options.gotoTimeout
          } );
        }
        if ( rejected ) { return; }
      }

      if ( options.resolveFromLoad ) {
        let result = null;
        if ( options.evaluate && !page.isClosed() ) {
          result = isPuppeteerPage( page ) ?
                   await page.evaluate( options.evaluate ) :
                   await page.evaluate( options.evaluate );
          if ( rejected ) { return; }
        }
        clearTimeout( timeoutID );
        await localResolve( result );
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
}

const isPuppeteerBrowserCreator = ( browserCreator: BrowserCreator ): browserCreator is PuppeteerBrowserCreator => browserCreator === puppeteer;

const launchBrowser = ( browserCreator: BrowserCreator, launchOptions: LaunchOptions ): Promise<Browser> => {
  return isPuppeteerBrowserCreator( browserCreator ) ?
         browserCreator.launch( launchOptions as PuppeteerLaunchOptions ) :
         browserCreator.launch( launchOptions as PlaywrightLaunchOptions );
};

const isPuppeteerPage = ( page: Page ): page is PuppeteerPage => 'setCacheEnabled' in page;

const errorFromMessage = ( message: unknown ): Error => message instanceof Error ? message : new Error( String( message ) );

const handleResponse = ( response: PuppeteerHTTPResponse | PlaywrightResponse, url: string, options: BrowserPageLoadOptionsBase<Page, Browser, LaunchOptions> ): void => {
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
};

const handleConsoleMessage = ( msg: PuppeteerConsoleMessage | PlaywrightConsoleMessage, options: BrowserPageLoadOptionsBase<Page, Browser, LaunchOptions> ): void => {
  let messageTxt = msg.text();

  // Append the location to messages that would benefit from it.
  if ( messageTxt.includes( 'net:' ) || messageTxt.includes( 'Failed to load resource' ) ) {
    messageTxt += `: \t ${msg.location().url}`;
  }

  if ( options.logConsoleOutput || ( msg.type() === 'error' && options.rejectPageErrors ) ) {
    options.logger( `[CONSOLE] ${messageTxt}` );
  }
};

const addPuppeteerPageListeners = ( page: PuppeteerPage, url: string, options: BrowserPageLoadOptionsBase<Page, Browser, LaunchOptions>, localReject: ( error: unknown ) => Promise<void> ): void => {
  page.on( 'response', response => handleResponse( response, url, options ) );
  page.on( 'console', msg => handleConsoleMessage( msg, options ) );
  page.on( 'error', async message => {
    options.logger( `[ERROR] ${message}` );
    if ( options.rejectErrors ) {
      await localReject( errorFromMessage( message ) );
    }
  } );
  page.on( 'pageerror', async message => {
    options.logger( `[PAGE ERROR] ${message}` );
    if ( options.rejectPageErrors ) {
      await localReject( errorFromMessage( message ) );
    }
  } );
  if ( options.logNavigation ) {
    page.on( 'frameattached', async ( frame: PuppeteerFrame ) => {
      options.logger( `[ATTACHED] ${frame.url()}` );
    } );
    page.on( 'framedetached', async ( frame: PuppeteerFrame ) => {
      options.logger( `[DETACHED] ${frame.url()}` );
    } );
    page.on( 'framenavigated', async ( frame: PuppeteerFrame ) => {
      options.logger( `[NAVIGATED] ${frame.url()}` );
    } );
  }
};

const addPlaywrightPageListeners = ( page: PlaywrightPage, url: string, options: BrowserPageLoadOptionsBase<Page, Browser, LaunchOptions>, localReject: ( error: unknown ) => Promise<void> ): void => {
  page.on( 'response', response => handleResponse( response, url, options ) );
  page.on( 'console', msg => handleConsoleMessage( msg, options ) );
  page.on( 'crash', async crashedPage => {
    options.logger( `[ERROR] Page crashed: ${crashedPage.url()}` );
    if ( options.rejectErrors ) {
      await localReject( new Error( `Page crashed: ${crashedPage.url()}` ) );
    }
  } );
  page.on( 'pageerror', async message => {
    options.logger( `[PAGE ERROR] ${message}` );
    if ( options.rejectPageErrors ) {
      await localReject( errorFromMessage( message ) );
    }
  } );
  if ( options.logNavigation ) {
    page.on( 'frameattached', async ( frame: PlaywrightFrame ) => {
      options.logger( `[ATTACHED] ${frame.url()}` );
    } );
    page.on( 'framedetached', async ( frame: PlaywrightFrame ) => {
      options.logger( `[DETACHED] ${frame.url()}` );
    } );
    page.on( 'framenavigated', async ( frame: PlaywrightFrame ) => {
      options.logger( `[NAVIGATED] ${frame.url()}` );
    } );
  }
};
