// Copyright 2017, University of Colorado Boulder

/**
 * Whether there is a remote branch for a given repo.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Whether there is a remote branch for a given repo.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The potential branch
 * @returns {Promise.<boolean>} - Whether there was the branch on the remote server
 */
module.exports = async function( repo, branch ) {
  winston.debug( `checking for remote branch ${branch} for ${repo}` );

  const stdout = await execute( 'git', [ 'ls-remote', '--heads', `https://github.com/phetsims/${repo}.git`, branch ], `../${repo}` );

  if ( stdout.trim().length === 0 ) {
    return false;
  }
  else if ( stdout.indexOf( `refs/heads/${branch}` ) >= 0 ) {
    return true;
  }
  else {
    throw new Error( `Failure trying to check for a remote branch ${branch} for ${repo}` );
  }
};
