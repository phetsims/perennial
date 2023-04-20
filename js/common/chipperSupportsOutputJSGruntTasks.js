// Copyright 2023, University of Colorado Boulder

/**
 * Loads and returns if chipperSupportsOutputJSGruntTasks
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const ChipperVersion = require( './ChipperVersion' );
const winston = require( 'winston' );

/**
 * Returns if chipperSupportsOutputJSGruntTasks
 * @public
 *
 * @returns {boolean}
 */
module.exports = function() {
  const chipperVersion = ChipperVersion.getFromRepository();
  const chipperSupportsOutputJSGruntTasks = chipperVersion.chipperSupportsOutputJSGruntTasks;
  winston.info( `chipperSupportsOutputJSGruntTasks: ${chipperSupportsOutputJSGruntTasks}` );
  return chipperSupportsOutputJSGruntTasks;
};