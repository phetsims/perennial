// Copyright 2017, University of Colorado Boulder

/**
 * Runs `grunt output-js-all`
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Sam Reid (PhET Interactive Simulations)
 */

const chipperSupportsOutputJSGruntTasks = require( './chipperSupportsOutputJSGruntTasks' );
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

  winston.info( 'running outputJSAll' );

  let ranOutputJS = false;

  // Not every version of chipper has the output-js task family.  Only proceed if it exists in this version of chipper.
  if ( chipperSupportsOutputJSGruntTasks() ) {

    // Not every repo supports the output-js task, only proceed if it is supported
    winston.info( 'running grunt output-js' );
    await execute( gruntCommand, [ 'output-js-all' ], '../chipper' );
    ranOutputJS = true;
  }
  if ( !ranOutputJS ) {
    winston.info( 'outputJS not detected, skipping...' );
  }
};