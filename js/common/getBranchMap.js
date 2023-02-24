// Copyright 2023, University of Colorado Boulder

/**
 * Gets a map of branch names (from the origin) to their remote SHAs
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Gets a map of branch names (from the origin) to their remote SHAs
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<Array.<Record<string, string>>>}
 * @rejects {ExecuteError}
 */
module.exports = async function( repo ) {
  winston.debug( `retrieving branches from ${repo}` );

  const result = {};

  ( await execute( 'git', [ 'ls-remote' ], `../${repo}` ) ).split( '\n' ).filter( line => line.includes( 'refs/heads/' ) ).forEach( line => {
    const branch = line.match( /refs\/heads\/(.*)/ )[ 1 ].trim();
    const sha = line.split( /\s+/ )[ 0 ].trim();
    result[ branch ] = sha;
  } );

  return result;
};
