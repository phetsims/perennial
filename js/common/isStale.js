// Copyright 2020, University of Colorado Boulder

/**
 * Asynchronously checks whether a repo is not up-to-date with origin/main
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getRemoteBranchSHAs = require( './getRemoteBranchSHAs' );
const gitRevParse = require( './gitRevParse' );

/**
 * Asynchronously checks whether a repo is not up-to-date with origin/main
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<boolean>}
 * @rejects {ExecuteError}
 */
module.exports = async function( repo ) {
  const currentSHA = await gitRevParse( repo, 'main' );
  const remoteSHA = ( await getRemoteBranchSHAs( repo ) ).main;

  return currentSHA !== remoteSHA;
};