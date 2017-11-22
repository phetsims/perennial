// Copyright 2017, University of Colorado Boulder

/**
 * git add
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Executes git add
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} file - The file to be added
 * @returns {Promise} - See execute for details
 */
module.exports = function( repo, file ) {
  winston.info( 'git add ' + file + ' on ' + repo );

  return execute( 'git', [ 'add', file ], '../' + repo );
};
