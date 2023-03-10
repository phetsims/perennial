// Copyright 2023, University of Colorado Boulder

/**
 * Gets the dependencies.json from a given branch of a repo
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getGitFile = require( './getGitFile' );
const createLocalBranchFromRemote = require( './createLocalBranchFromRemote' );

/**
 * Gets the dependencies.json from a given branch of a repo
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The branch name
 * @param {string} filename - The file name
 * @returns {Promise} - Resolves to the file contents
 * @rejects {ExecuteError}
 */
module.exports = async function getFileAtBranch( repo, branch, filename ) {

  try {
    return await getGitFile( repo, branch, filename );
  }
  catch( e ) {
    if ( e.message.includes( 'invalid object name' ) && e.message.includes( branch ) ) {

      await createLocalBranchFromRemote( repo, branch );
      return getGitFile( repo, branch, filename );
    }
    else {
      throw e;
    }
  }
};
