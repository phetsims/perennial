// Copyright 2021, University of Colorado Boulder

/**
 * Checks whether a git commit exists (locally) in a repo
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );

/**
 * Executes git commit
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} sha - The SHA of the commit
 * @returns {Promise.<boolean>}
 */
module.exports = async function( repo, sha ) {

  const result = await execute( 'git', [ 'cat-file', '-e', sha ], `../${repo}`, {
    errors: 'resolve'
  } );

  if ( result.code === 0 ) {
    return true;
  }
  else if ( result.code === 1 ) {
    return false;
  }
  else {
    throw new Error( `Non-zero and non-one exit code from git cat-file: ${result}` );
  }
};
