// Copyright 2017, University of Colorado Boulder

/**
 * Uses puppeteer to see whether a page loads without an error
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const sleep = require( './sleep' );
const _ = require( 'lodash' ); // eslint-disable-line
const puppeteer = require( 'puppeteer' );
const winston = require( 'winston' );

/**
 * Uses puppeteer to see whether a page loads without an error
 * @public
 *
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise.<Error|null|*>} - Resolves with an error if available, or the eval result/null if successful
 */
module.exports = async function( url, options ) {

  options = _.extend( {

    // See https://github.com/puppeteer/puppeteer/blob/v14.1.1/docs/api.md#puppeteerlaunchoptions
    launchOptions: {},

    browser: null, // {puppeteer.Browser|null} - If provided, we'll use a persistent browser

    evaluate: null, // {function|null}

    resolvePageErrors: true, // resolve when the page errors
    waitAfterLoad: 5000, // milliseconds
    allowedTimeToLoad: 40000, // milliseconds
    puppeteerTimeout: 30000 // milliseconds
  }, options );

  const ownsBrowser = !options.browser;
  const browser = ownsBrowser ? await puppeteer.launch( options.launchOptions ) : options.browser;

  let page;
  try {
    page = await browser.newPage();
    await page.setDefaultNavigationTimeout( options.puppeteerTimeout );

    let resolve;
    let loaded = false;
    const promise = new Promise( ( res, rej ) => {
      resolve = res;
    } );

    page.on( 'load', async () => {
      loaded = true;
      await sleep( options.waitAfterLoad );
      resolve( options.evaluate && !page.isClosed() ? await page.evaluate( options.evaluate ) : null );
    } );
    page.on( 'error', message => {
      winston.info( `puppeteer error: ${message}` );
      resolve( new Error( message ) );
    } );
    page.on( 'pageerror', message => {
      if ( options.resolvePageErrors ) {
        winston.info( `puppeteer pageerror: ${message}` );
        resolve( new Error( message ) );
      }
    } );
    ( async () => {
      await sleep( options.allowedTimeToLoad );
      if ( !loaded ) {
        winston.info( 'puppeteer not loaded' );
        resolve( new Error( `Did not load in ${options.allowedTimeToLoad}` ) );
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
    return e;
  }
};
