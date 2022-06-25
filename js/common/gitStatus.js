// Copyright 2018, University of Colorado Boulder

/**
 * Returns a combination of status information for the repository's git status
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const getBranch = require( './getBranch' );
const getRemoteBranchSHAs = require( './getRemoteBranchSHAs' );
const gitRevParse = require( './gitRevParse' );
const assert = require( 'assert' );

/**
 * Returns a combination of status information for the repository's git status
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<{symbolicRef:string, branch:string, sha:string, status:string, [trackingBranch:string}, [ahead:number], [behind:number]}>}
 */
module.exports = async function( repo ) {
  assert( typeof repo === 'string' );

  const result = {};

  // This is needed to get the below `git rev-list` with ${u} to actually compare with the remote state.
  await execute( 'git', [ 'remote', 'update' ], `../${repo}` );

  result.symbolicRef = await execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], `../${repo}` );
  result.branch = await getBranch( repo ); // might be empty string
  result.sha = await gitRevParse( repo, 'HEAD' );
  result.status = await execute( 'git', [ 'status', '--porcelain' ], `../${repo}` );

  if ( result.branch ) {
    // Safe method to get ahead/behind counts, see http://stackoverflow.com/questions/2969214/git-programmatically-know-by-how-much-the-branch-is-ahead-behind-a-remote-branc

    result.remoteSHA = ( await getRemoteBranchSHAs( repo ) )[ result.branch ];

    // get the tracking-branch name
    result.trackingBranch = await execute( 'git', [ 'for-each-ref', '--format=\'%(upstream:short)\'', result.symbolicRef ], `../${repo}` );

    // e.g. behind-count + '\t' + ahead-count
    const counts = await execute( 'git', [ 'rev-list', '--left-right', '--count', `${result.trackingBranch}@{u}...HEAD` ], `../${repo}` );

    result.behind = Number( counts.split( '\t' )[ 0 ] );
    result.ahead = Number( counts.split( '\t' )[ 1 ] );
    result.remoteDifferent = result.remoteSHA !== result.sha;

    if ( result.remoteDifferent ) {
      assert( result.behind > 0 || result.ahead > 0, 'We should be ahead or behind commits if our remote SHA is different than our HEAD' );
    }
  }

  return result;
};
