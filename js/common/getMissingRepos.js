// Copyright 2020, University of Colorado Boulder

/**
 * Returns the list of repos listed in active-repos that are not checked out.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getRepoList = require( './getRepoList' );
const fs = require( 'fs' );

/**
 * Returns the list of repos listed in active-repos that are not checked out.
 * @public
 *
 * @returns {Array.<string>}
 */
module.exports = function( omitPrivate, reposToCheck = getRepoList( 'active-repos' ) ) {
  const activePrivateRepos = getRepoList( 'active-repos-private' );
  const missingRepos = [];

  const possibleRepos = omitPrivate ? reposToCheck.filter( repo => !activePrivateRepos.includes( repo ) ) : reposToCheck;

  for ( const repo of possibleRepos ) {
    if ( !fs.existsSync( `../${repo}` ) ) {
      missingRepos.push( repo );
    }
  }
  return missingRepos;
};