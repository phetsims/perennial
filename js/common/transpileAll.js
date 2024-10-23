// Copyright 2017, University of Colorado Boulder

/**
 * TODO: Rename to "transpileAll" https://github.com/phetsims/chipper/issues/1499
 * Runs `grunt transpile --all`
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Sam Reid (PhET Interactive Simulations)
 */

const execute = require( './execute' );
const gruntCommand = require( './gruntCommand' );
const winston = require( 'winston' );

/**
 * Outputs JS for a directory
 * @public
 *
 * @returns {Promise}
 */
module.exports = async function() {
  winston.info( 'running transpileAll' );
  await execute( gruntCommand, [ 'transpile', '--silent' ], '../chipper' );
};