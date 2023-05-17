// Copyright 2017, University of Colorado Boulder

/**
 * git pull
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const gitPullDirectory = require( './gitPullDirectory' );

/**
 * Executes git pull
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = async function( repo ) {
  await gitPullDirectory( `../${repo}` );
};
