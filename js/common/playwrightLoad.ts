// Copyright 2023, University of Colorado Boulder

/**
 * Uses playwright to see whether a page loads without an error. Throws errors it receives
 *
 * Defaults to using firefox, but you can provide any playwright browser for this
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { browserPageLoad, PlaywrightBrowserPageLoadOptions } from './browserPageLoad.js';
import playwright from 'playwright';
import type { BrowserType as PlaywrightBrowserType } from 'playwright';
import _ from 'lodash';

type PlaywrightLoadOptions = PlaywrightBrowserPageLoadOptions & {
  testingBrowserCreator: PlaywrightBrowserType;
};

/**
 * Rejects if encountering an error loading the page OR (with option provided within the puppeteer page itself).
 *
 * @param url
 * @param options - see browserPageLoad
 * @returns The eval result/null
 */
export const playwrightLoad = async ( url: string, options?: PlaywrightBrowserPageLoadOptions ): Promise<unknown> => {
  const mergedOptions: PlaywrightLoadOptions = _.merge( {
    testingBrowserCreator: playwright.firefox
  }, options );
  return browserPageLoad( mergedOptions.testingBrowserCreator, url, mergedOptions );
};
