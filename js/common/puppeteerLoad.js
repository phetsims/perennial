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

  options = _.extend( { // eslint-disable-line

    browser: null, // {puppeteer.Browser|null} - If provided, we'll use a persistent browser

    evaluate: null, // {function|null}

    resolvePageErrors: true, // resolve when the page errors
    waitAfterLoad: 5000, // milliseconds
    allowedTimeToLoad: 40000, // milliseconds
    puppeteerTimeout: 30000 // milliseconds
  }, options );

  const hasBrowser = !!options.browser;
  const browser = hasBrowser ? options.browser : await puppeteer.launch();

  const page = await browser.newPage();
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
  page.on( 'error', error => {
    winston.info( `puppeteer error: ${error}` );
    resolve( new Error( error ) );
  } );
  page.on( 'pageerror', error => {
    winston.info( `puppeteer pageerror: ${error}` );
    if ( options.resolvePageErrors ) {
      resolve( new Error( error ) );
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
  await page.close();

  if ( hasBrowser ) {
    await browser.close();
  }

  return result;
};
