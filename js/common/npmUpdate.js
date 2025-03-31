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
 * @param {boolean} prune - `npm prune` first before running `npm update`
 * @returns {Promise}
 */
module.exports = async function( repo, prune = true ) {
  await npmUpdateDirectory( `../${repo}`, prune );
};