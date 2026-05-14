// Copyright 2023-2026, University of Colorado Boulder

/**
 * Uses puppeteer to see whether a page loads without an error. Throws errors it receives
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { browserPageLoad, BrowserPageLoadOptions } from './browserPageLoad.js';
import puppeteer, { Browser } from 'puppeteer';

/**
 * Uses puppeteer to see whether a page loads without an error
 *
 * Rejects if encountering an error loading the page OR (with option provided within the puppeteer page itself).
 *
 * @param {string} url
 * @param {Object} [options] - see browserPageLoad
 * @returns {Promise.<null|*>} - The eval result/null
 */
export const puppeteerLoad = async ( url: string, options?: BrowserPageLoadOptions ) => {
  // TODO: look into typing issue
  return browserPageLoad( puppeteer as unknown as Browser, url, options );
};
