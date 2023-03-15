// Copyright 2017, University of Colorado Boulder

/**
 * The dependencies.json of a repository
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const loadJSON = require( './loadJSON' );
const winston = require( 'winston' );

/**
 * Executes git checkout
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise} - Resolves to the dependencies.json content
 */
module.exports = function getDependencies( repo ) {
  winston.info( `getting dependencies.json for ${repo}` );

  return loadJSON( `../${repo}/dependencies.json` );
};
