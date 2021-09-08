// Copyright 2017, University of Colorado Boulder

/**
 * Runs `grunt output-js`
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Sam Reid (PhET Interactive Simulations)
 */

const execute = require( '../dual/execute' );
const gruntCommand = require( '../common/gruntCommand' );
const winston = require( 'winston' );
const ChipperVersion = require( '../common/ChipperVersion' );

/**
 * Outputs JS for a directory
 * @public
 *
 * @param {string} cwd
 * @returns {Promise}
 */
module.exports = async function( cwd ) {

  winston.info( 'running outputJS' );

  const chipperVersion = ChipperVersion.getFromRepository();

  if ( chipperVersion.outputJS ) {
    winston.info( 'running grunt output-js' );
    await execute( gruntCommand, [ 'output-js' ], cwd );
  }
  else {
    winston.info( 'outputJS not detected, skipping...' );
  }
};