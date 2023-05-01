// Copyright 2023, University of Colorado Boulder

/**
 * Uses puppeteer to see whether a page loads without an error. Throws errors it receives
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const puppeteerLoad = require( './puppeteerLoad' );
const puppeteer = require( 'puppeteer' );

/**
 * Uses puppeteer to see whether a page loads without an error
 * @public
 *
 * Rejects if encountering an error loading the page OR (with option provided within the puppeteer page itself).
 *
 * @param {string} url
 * @param {Object} [options] - see puppeteerLoad
 * @returns {Promise.<null|*>} - The eval result/null
 */
module.exports = async function( url, options ) {
  return puppeteerLoad( puppeteer, url, options );
};
