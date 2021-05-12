// Copyright 2017, University of Colorado Boulder

/**
 * Uses puppeteer to see whether a page loads without an error
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

const puppeteer = require( 'puppeteer' );

/**
 * Uses puppeteer to see whether a page loads without an error
 * @public
 *
 * @param {string} url
 * @returns {Promise.<boolean>} - Success or failure
 */
module.exports = async function( url ) {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  // page.on( 'load', () => console.log("Loaded: " + page.url()));
  // page.on( 'error', msg => end( { ok: false, result: 'error', message: msg } ) );
  // page.on( 'pageerror', msg => end( { ok: false, result: 'pageerror', message: msg } ) );

  await page.goto( url );

  await browser.close();
};
