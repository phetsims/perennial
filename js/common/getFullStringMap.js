// Copyright 2023, University of Colorado Boulder

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in all dependencies for a given repo
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getDependencyRepos = require( './getDependencyRepos' );
const getRepoStringMap = require( './getRepoStringMap' );

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in all dependencies for a given repo
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<stringMap[ stringKey ][ locale ]>}
 */
module.exports = async function( repo ) {

  let result = {};

  for ( const dependencyRepo of await getDependencyRepos( repo ) ) {
    result = { ...result, ...await getRepoStringMap( dependencyRepo ) };
  }

  return result;
};
