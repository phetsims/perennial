// Copyright 2017, University of Colorado Boulder

/**
 * npm update
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var execute = require( './execute' );
var npmCommand = require( './npmCommand' );
var winston = require( 'winston' );

/**
 * Executes an effective "npm update" (with pruning because it's required).
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise}
 */
module.exports = async function( repo ) {
  winston.info( 'npm update on ' + repo );

  await execute( npmCommand, [ 'prune' ], '../' + repo );
  await execute( npmCommand, [ 'update' ], '../' + repo );
};
