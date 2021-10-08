// Copyright 2017, University of Colorado Boulder

/**
 * Uses puppeteer to load a page, evaluate some Javascript, and then returns the result
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const puppeteerLoad = require( './puppeteerLoad' );
const _ = require( 'lodash' ); // eslint-disable-line

/**
 * Uses puppeteer to load a page, evaluate some Javascript, and then returns the result
 * @public
 *
 * @param {string} url
 * @param {function} evalute - run in the browser
 * @param {Object} [options]
 * @returns {Promise.<*>} - Will reject if there's an error
 */
module.exports = async function( url, evaluate, options ) {
  options = _.extend( { // eslint-disable-line
    evaluate: evaluate
  }, options );

  const result = await puppeteerLoad( url, options );

  if ( result instanceof Error ) {
    throw result;
  }

  return result;
};
