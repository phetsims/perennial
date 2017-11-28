// Copyright 2017, University of Colorado Boulder

/**
 * git pull
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Executes git pull
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise} - See execute for details
 */
module.exports = function( repo ) {
  winston.info( `git pull on ${repo}` );

  return execute( 'git', [ 'pull' ], `../${repo}` );
};
