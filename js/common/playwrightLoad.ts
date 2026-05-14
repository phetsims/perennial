// Copyright 2023, University of Colorado Boulder

/**
 * Uses playwright to see whether a page loads without an error. Throws errors it receives
 *
 * Defaults to using firefox, but you can provide any playwright browser for this
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { browserPageLoad, BrowserPageLoadOptions } from './browserPageLoad.js';
import playwright from 'playwright';
import _ from 'lodash';

/**
 * Rejects if encountering an error loading the page OR (with option provided within the puppeteer page itself).
 *
 * @param {string} url
 * @param {Object} [options] - see browserPageLoad
 * @returns {Promise.<null|*>} - The eval result/null
 */
export const playwrightLoad = async ( url: string, options?: BrowserPageLoadOptions ) => {
  options = _.merge( {
    testingBrowserCreator: playwright.firefox
  }, options );
  // TODO: fix type issue
  return browserPageLoad( options.testingBrowserCreator, url, options );
};
