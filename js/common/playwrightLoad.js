// Copyright 2023, University of Colorado Boulder

/**
 * Uses playwright to see whether a page loads without an error. Throws errors it receives
 *
 * Defaults to using firefox, but you can provide any playwright browser for this
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const puppeteerLoad = require( './puppeteerLoad' );
const playwright = require( 'playwright' );
const _ = require( 'lodash' );

/**
 * @public
 *
 * Rejects if encountering an error loading the page OR (with option provided within the puppeteer page itself).
 *
 * @param {string} url
 * @param {Object} [options] - see puppeteerLoad
 * @returns {Promise.<null|*>} - The eval result/null
 */
module.exports = async function( url, options ) {
  options = _.merge( {
    testingBrowserCreator: playwright.firefox
  }, options );
  return puppeteerLoad( options.testingBrowserCreator, url, options );
};
