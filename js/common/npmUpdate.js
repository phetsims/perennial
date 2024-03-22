// Copyright 2017, University of Colorado Boulder

/**
 * npm update
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const npmUpdateDirectory = require( './npmUpdateDirectory' );

/**
 * Executes an effective "npm update" (with pruning because it's required).
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise}
 */
module.exports = async function( repo ) {
  await npmUpdateDirectory( `../${repo}` );
};