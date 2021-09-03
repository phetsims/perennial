// Copyright 2017, University of Colorado Boulder

/**
 * Runs `grunt output-js-all`
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Sam Reid (PhET Interactive Simulations)
 */

const execute = require( '../dual/execute' );
const gruntCommand = require( '../common/gruntCommand' );
const winston = require( 'winston' );
const ChipperVersion = require( '../common/ChipperVersion' );

/**
 * Builds a repository.
 * @public
 *
 * @returns {Promise.<Object>} - The stdout of the build
 */
module.exports = async function( repo ) {

  winston.info( 'running outputJSAll' );

  const chipperVersion = ChipperVersion.getFromRepository();

  if ( chipperVersion.outputJS ) {
    winston.info( 'running grunt output-js-all' );
    await execute( gruntCommand, [ 'output-js-all' ] );
  }
  else {
    winston.info( 'outputJS not detected, skipping...' );
  }
};