// Copyright 2017, University of Colorado Boulder

/**
 * Lints a runnable repository and its dependencies.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( '../common/execute' );
const gruntCommand = require( '../common/gruntCommand' );
const winston = require( 'winston' );

/**
 * Builds a repository.
 * @public
 *
 * @param {string} repo
 * @returns {Promise.<string>} - The stdout of the process
 * @rejects {ExecuteError}
 */
module.exports = async function( repo ) {
  winston.info( `linting ${repo}` );

  return execute( gruntCommand, [ 'lint-all' ], `../${repo}` );
};
