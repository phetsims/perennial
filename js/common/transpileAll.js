// Copyright 2017, University of Colorado Boulder

/**
 * Runs `grunt transpile --all` in current version of chipper. Will hard fail if on old shas that predate this task
 * creation in 10/2024.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Sam Reid (PhET Interactive Simulations)
 */

const execute = require( './execute' ).default;
const gruntCommand = require( './gruntCommand' );
const winston = require( 'winston' );

/**
 * Outputs transpiled JS for all repos
 * @public
 *
 * @returns {Promise}
 */
module.exports = async function() {
  winston.info( 'running transpileAll' );
  await execute( gruntCommand, [ 'transpile', '--all', '--silent' ], '../chipper' );
};