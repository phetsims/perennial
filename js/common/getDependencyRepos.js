// Copyright 2017-2023, University of Colorado Boulder

/**
 * The repos (keys) from dependencies.json of a repository
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const loadJSON = require( './loadJSON' );
const winston = require( 'winston' );

/**
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Object} [options]
 * @returns {Promise} - Resolves to the list of repos in the dependencies.json of the provided repo
 */
module.exports = async function getDependencyRepos( repo, options ) {
  winston.info( `getting dependencies.json for ${repo}` );

  const { cwd = '..' } = options || {};

  const json = await loadJSON( `${cwd}/${repo}/dependencies.json` );
  return Object.keys( json ).filter( key => key !== 'comment' );
};