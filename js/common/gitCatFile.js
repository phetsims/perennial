// Copyright 2017, University of Colorado Boulder

/**
 * retrieve the contents of a file without changing the git tree via checkouts.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const assert = require( 'assert' );
const execute = require( './execute' ).default;

/**
 * Gets the contents of the file at a given state in the git tree
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} file - Path to the file from the repo root, like js/myFile.js
 * @param {string} branchOrSha - what revision to get the contents of the file at. "buoyancy-1.0" or "main" or
 *                               "{{SHA}}". Defaults to the current checkout (HEAD)
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = async function gitCatFile( repo, file, branchOrSha = 'HEAD' ) {
  assert( typeof repo === 'string' );
  assert( typeof file === 'string' );
  assert( typeof branchOrSha === 'string' );

  return execute( 'git', [ 'cat-file', 'blob', `${branchOrSha}:${file}` ], `../${repo}` );
};