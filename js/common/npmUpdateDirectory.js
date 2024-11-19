// Copyright 2023, University of Colorado Boulder

/**
 * npm update
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' ).default;
const npmCommand = require( './npmCommand' );
const winston = require( 'winston' );
const asyncMutex = require( 'async-mutex' );

const mutex = new asyncMutex.Mutex();

/**
 * Executes an effective "npm update" (with pruning because it's required).
 * @public
 *
 * @param {string} directory
 * @returns {Promise}
 */
module.exports = async function( directory ) {
  winston.info( `npm update in ${directory}` );

  // NOTE: Run these synchronously across all instances!
  await mutex.runExclusive( async () => {
    await execute( npmCommand, [ 'prune' ], directory );
    await execute( npmCommand, [ 'update' ], directory );
  } );
};