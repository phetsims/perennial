// Copyright 2018, University of Colorado Boulder

/**
 * Returns a combination of status information for the repository's git status
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */


const execute = require( '../dual/execute' );
const getBranch = require( './getBranch' );
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

  result.symbolicRef = await execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], `../${repo}` );
  result.branch = await getBranch( repo ); // might be empty string
  result.sha = await gitRevParse( repo, 'HEAD' );
  result.status = await execute( 'git', [ 'status', '--porcelain' ], `../${repo}` );

  if ( result.branch ) {
    // Safe method to get ahead/behind counts, see http://stackoverflow.com/questions/2969214/git-programmatically-know-by-how-much-the-branch-is-ahead-behind-a-remote-branc

    // get the tracking-branch name
    result.trackingBranch = await execute( 'git', [ 'for-each-ref', '--format=\'%(upstream:short)\'', result.symbolicRef ], `../${repo}` );

    // e.g. behind-count + '\t' + ahead-count
    const counts = await execute( 'git', [ 'rev-list', '--left-right', '--count', `${result.trackingBranch}...HEAD` ], `../${repo}` );

    result.behind = parseInt( counts.split( '\t' )[ 0 ], 10 );
    result.ahead = parseInt( counts.split( '\t' )[ 1 ], 10 );
  }

  return result;
};
