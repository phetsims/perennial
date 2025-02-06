// Copyright 2017, University of Colorado Boulder

/**
 * git pull --rebase
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' ).default;
const winston = require( 'winston' );

/**
 * Executes git pull
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = function gitPullRebase( repo ) {
  winston.info( `git pull --rebase on ${repo}` );

  return execute( 'git', [ 'pull', '--rebase' ], `../${repo}` );
};