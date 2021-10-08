// Copyright 2017, University of Colorado Boulder

/**
 * git push
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Executes git push
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} remoteBranch - The branch that is getting pushed to, e.g. 'master' or '1.0'
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function( repo, remoteBranch ) {
  winston.info( `git push on ${repo} to ${remoteBranch}` );

  return execute( 'git', [ 'push', '-u', 'origin', remoteBranch ], `../${repo}` );
};
