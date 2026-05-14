// Copyright 2023-2026, University of Colorado Boulder

/**
 * Uses puppeteer to see whether a page loads without an error. Throws errors it receives
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { browserPageLoad, PuppeteerBrowserPageLoadOptions } from './browserPageLoad.js';
import puppeteer from 'puppeteer';

/**
 * Uses puppeteer to see whether a page loads without an error
 *
 * Rejects if encountering an error loading the page OR (with option provided within the puppeteer page itself).
 *
 * @param url
 * @param options - see browserPageLoad
 * @returns The eval result/null
 */
export const puppeteerLoad = async ( url: string, options?: PuppeteerBrowserPageLoadOptions ): Promise<unknown> => {
  return browserPageLoad( puppeteer, url, options );
};
