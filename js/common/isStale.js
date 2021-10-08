// Copyright 2020, University of Colorado Boulder

/**
 * Asynchronously checks whether a repo is not up-to-date with origin/master
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getRemoteBranchSHAs = require( './getRemoteBranchSHAs' );
const gitRevParse = require( './gitRevParse' );

/**
 * Asynchronously checks whether a repo is not up-to-date with origin/master
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<boolean>}
 * @rejects {ExecuteError}
 */
module.exports = async function( repo ) {
  const currentSHA = await gitRevParse( repo, 'master' );
  const remoteSHA = ( await getRemoteBranchSHAs( repo ) ).master;

  return currentSHA !== remoteSHA;
};
