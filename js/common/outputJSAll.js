// Copyright 2017, University of Colorado Boulder

/**
 * TODO: Rename to "transpileAll" https://github.com/phetsims/chipper/issues/1499
 * Runs `grunt transpile --all`
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
  // TODO: Delete this check. It isn't correct because we changed the API for output-js-all in 10/21/24. https://github.com/phetsims/chipper/issues/1499
  if ( chipperSupportsOutputJSGruntTasks() ) {

    // Not every repo supports the output-js task, only proceed if it is supported
    winston.info( 'running grunt transpile' );
    await execute( gruntCommand, [ 'transpile', '--silent' ], '../chipper' );
    ranOutputJS = true;
  }
  if ( !ranOutputJS ) {
    winston.info( 'outputJS not detected, skipping...' );
  }
};