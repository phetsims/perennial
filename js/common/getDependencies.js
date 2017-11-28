// Copyright 2017, University of Colorado Boulder

/**
 * The dependencies.json of a repository
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const loadJSON = require( './loadJSON' );
const winston = require( 'winston' );

/**
 * Executes git checkout
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Function} callback - callback( dependencies: {Object} )
 * @param {Function} [errorCallback] - errorCallback( {*} error )
 */
module.exports = function( repo, callback, errorCallback ) {
  winston.info( `getting dependencies.json for ${repo}` );

  return loadJSON( `../${repo}/dependencies.json` );
};
