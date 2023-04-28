// Copyright 2017, University of Colorado Boulder

/**
 * Uses puppeteer to load a page, evaluate some Javascript, and then returns the result
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const puppeteerLoad = require( './puppeteerLoad' );
const _ = require( 'lodash' );

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
  options = _.extend( {
    evaluate: evaluate
  }, options );

  return puppeteerLoad( url, options );
};
