// Copyright 2017, University of Colorado Boulder

/**
 * Checks to see if the git state/status is clean
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Checks to see if the git state/status is clean
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise} - Resolves {boolean} - Whether it is clean or not
 */
module.exports = function( repo ) {
  winston.debug( 'git status check on ' + repo );

  return execute( 'git', [ 'status', '--porcelain' ], '../' + repo ).then( stdout => Promise.resolve( stdout.length === 0 ) );
};
