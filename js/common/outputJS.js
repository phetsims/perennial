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
 * @returns {Promise.<Object>} - The results of the build, see execute with resolve
 */
module.exports = async function( cwd ) {

  winston.info( 'running outputJS' );

  const chipperVersion = ChipperVersion.getFromRepository();

  if ( chipperVersion.outputJS ) {
    winston.info( 'running grunt output-js' );
    return execute( gruntCommand, [ 'output-js' ], cwd, {
      errors: 'resolve'
    } );
  }
  else {
    winston.info( 'outputJS not detected, skipping...' );
    return Promise.all( [] );
  }
};