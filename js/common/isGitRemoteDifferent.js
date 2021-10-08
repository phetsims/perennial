// Copyright 2021, University of Colorado Boulder

/**
 * Whether the current branch's remote SHA differs from the current SHA
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const assert = require( 'assert' );
const getBranch = require( './getBranch' );
const getRemoteBranchSHAs = require( './getRemoteBranchSHAs' );
const gitRevParse = require( './gitRevParse' );

/**
 * Whether the current branch's remote SHA differs from the current SHA
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<boolean>}
 */
module.exports = async function( repo ) {
  assert( typeof repo === 'string' );

  const branch = await getBranch( repo );
  const currentSHA = await gitRevParse( repo, 'HEAD' );
  const remoteSHA = ( await getRemoteBranchSHAs( repo ) )[ branch ];

  return currentSHA !== remoteSHA;
};
