// Copyright 2019, University of Colorado Boulder

/**
 * Compare the PDOM html of two versions of the same sim. This is a helpful test to see if there has been any changes
 * to the descriptions.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

'use strict';

// modules
const buildLocal = require( '../common/buildLocal' );
const execute = require( '../common/execute' );
const puppeteer = require( 'puppeteer' );
const htmlDiffer = require( 'html-differ' ); // eslint-disable-line require-statement-match
const logger = require( 'html-differ/lib/logger' );

// constants
const HtmlDiffer = htmlDiffer.HtmlDiffer;

module.exports = async ( repo ) => {


  // TODO: get working with dependencies instead of just stashed copy changes
  // TODO: add in functions that can be executed to change the model in between tests.

  const puppeteerTest = async () => {

    return new Promise( async ( resolve, reject ) => {

      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      page.on( 'console', async msg => {

        console.log( msg.text() );
      } );

      page.on( 'load', async () => {

        // TODO: find a better way to wait until the sim is loaded, we can't use postMessageOnLoad or sim.endedSimConstructionEmitter because of timing
        setTimeout( async () => {

          const pdomText = await page.evaluate( () => {
            return phet.joist.sim.display.accessibleDOMElement.outerHTML;
          } );
          browser.close();

          resolve( pdomText );
        }, 10000 );
      } );

      page.on( 'error', msg => reject( msg ) );
      page.on( 'pageerror', msg => reject( msg ) );

      try {
        await page.goto( `${buildLocal.localTestingURL}${repo}/${repo}_en.html?brand=phet&postMessageOnLoad` );
      }
      catch( e ) {
        browser.close();
        reject( e );
      }
    } );
  };

  // test current working copy
  const workingCopy = await puppeteerTest();

  // TODO: this only stashes the single repo

  await execute( 'git', [ 'diff-index', '--quiet', 'HEAD', '--' ], `../${repo}` );

  // If there are no local copy changes, then we should not apply stash changes after master's test, so keep track.
  // An exit code of 0 means that there are no working copy changes in the repo
  const shouldStash = await execute( 'echo', [ '"$?"' ] ) !== 0;

  // stash working copy changes
  shouldStash && await execute( 'git', [ 'stash' ], `../${repo}` );

  const master = await puppeteerTest();
  shouldStash && await execute( 'git', [ 'stash', 'apply' ], `../${repo}` );

  const htmlDiffer = new HtmlDiffer( {
    ignoreAttributes: [ 'id' ],
    compareAttributesAsJSON: [],
    ignoreWhitespaces: true,
    ignoreComments: true,
    ignoreEndTags: false,
    ignoreDuplicateAttributes: false
  } );

  const diff = htmlDiffer.diffHtml( workingCopy, master );

  // TODO: better interpretation of the diff that is output. Perhaps by looking at "diff" more manually, see https://www.npmjs.com/package/html-differ
  logger.logDiffText( diff, { charsAroundDiff: 40 } );
};
