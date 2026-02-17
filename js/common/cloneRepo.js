// Copyright 2017, University of Colorado Boulder

/**
 * Clones the given repo name into the working copy
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

const gitCloneDirectory = require( './gitCloneDirectory' );

/**
 * Clones the given repo name into the working copy
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise}
 */
module.exports = function cloneRepo( repo ) {
  return gitCloneDirectory( repo, '../' );
};