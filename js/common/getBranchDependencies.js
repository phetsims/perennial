// Copyright 2023, University of Colorado Boulder

/**
 * Gets the dependencies.json from a given branch of a repo
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getFileAtBranch = require( './getFileAtBranch' );

/**
 * Gets the dependencies.json from a given branch of a repo
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The branch name
 * @returns {Promise} - Resolves to the dependencies.json content
 * @rejects {ExecuteError}
 */
module.exports = async function( repo, branch ) {
  return JSON.parse( await getFileAtBranch( repo, branch, 'dependencies.json' ) );
};