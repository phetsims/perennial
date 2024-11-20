// Copyright 2017, University of Colorado Boulder

/**
 * git pull with an assumption that your cwd is in the top of a repo, like perennial/ or chipper/.
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
module.exports = async function gitPull( repo ) {
  await gitPullDirectory( `../${repo}` );
};