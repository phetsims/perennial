// Copyright 2017-2022, University of Colorado Boulder

/**
 * Uses puppeteer to see whether a page loads without an error. Throws errors it receives
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const sleep = require( './sleep' );
const _ = require( 'lodash' ); // eslint-disable-line require-statement-match
const puppeteer = require( 'puppeteer' );
const winston = require( 'winston' );

/**
 * Uses puppeteer to see whether a page loads without an error
 * @public
 *
 * Rejects if encountering an error loading the page OR (with option provided within the puppeteer page itself).
 *
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise.<null|*>} - The eval result/null
 */
module.exports = async function( url, options ) {

  options = _.extend( {

    // See https://github.com/puppeteer/puppeteer/blob/v14.1.1/docs/api.md#puppeteerlaunchoptions
    launchOptions: {},

    browser: null, // {puppeteer.Browser|null} - If provided, we'll use a persistent browser

    evaluate: null, // {function|null}
    waitForFunction: null, // {string|null}

    rejectPageErrors: true, // reject when the page errors
    waitAfterLoad: 5000, // milliseconds
    allowedTimeToLoad: 40000, // milliseconds
    puppeteerTimeout: 30000 // milliseconds
  }, options );

  const ownsBrowser = !options.browser;

  let browser;
  let page;

  try {
    browser = options.browser || await puppeteer.launch( options.launchOptions );

    page = await browser.newPage();
    await page.setDefaultNavigationTimeout( options.puppeteerTimeout );

    // promote for use outside the closure
    let resolve;
    let reject;
    const promise = new Promise( ( res, rej ) => {
      resolve = res;
      reject = rej;
    } );

    let loaded = false;
    page.on( 'load', async () => {
      loaded = true;
      await sleep( options.waitAfterLoad );
      if ( options.waitForFunction ) {
        await page.waitForFunction( options.waitForFunction, {
          polling: 100, // default is every animation frame
          timeout: options.puppeteerTimeout
        } );
      }
      resolve( options.evaluate && !page.isClosed() ? await page.evaluate( options.evaluate ) : null );
    } );
    page.on( 'error', message => {
      winston.info( `puppeteer error: ${message}` );
      reject( new Error( message ) );
    } );
    page.on( 'pageerror', message => {
      if ( options.rejectPageErrors ) {
        winston.info( `puppeteer pageerror: ${message}` );
        reject( new Error( message ) );
      }
    } );
    ( async () => {
      await sleep( options.allowedTimeToLoad );
      if ( !loaded ) {
        winston.info( 'puppeteer not loaded' );
        reject( new Error( `Did not load in ${options.allowedTimeToLoad}` ) );
      }
    } )();
    await page.goto( url, {
      timeout: options.puppeteerTimeout
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
