// Copyright 2017, University of Colorado Boulder

/**
 * npm update
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const npmUpdateDirectory = require( './npmUpdateDirectory' );

/**
 * Executes an effective "npm install", ensuring that the node_modules versions match package.json (and the lock file if present).
 * @public
 *
 * @param {string} repo - The repository name
 * @param {{ clean?: boolean, preferOffline?: boolean, minimal?: boolean }} [options]
 * @returns {Promise}
 */
module.exports = async function( repo, options ) {
  await npmUpdateDirectory( `../${repo}`, options );
};