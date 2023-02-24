// Copyright 2023, University of Colorado Boulder

/**
 * Gets the contents of a file at a specific git branch/SHA/object
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );

/**
 * Gets the contents of a file at a specific git branch/SHA/object
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} gitObject - The branch/SHA/object name
 * @param {string} filename - The filename - relative to the root of the repository
 * @returns {Promise} - Resolves to the file content
 * @rejects {ExecuteError}
 */
module.exports = async function( repo, gitObject, filename ) {

  return execute( 'git', [ 'show', `${gitObject}:./${filename}` ], `../${repo}` );
};
