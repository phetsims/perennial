// Copyright 2017, University of Colorado Boulder

/**
 * Gets a list of branch names from the origin
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Gets a list of branch names from the origin
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<Array.<string>>}
 * @rejects {ExecuteError}
 */
module.exports = async function( repo ) {
  winston.debug( `retrieving branches from ${repo}` );

  return ( await execute( 'git', [ 'ls-remote' ], `../${repo}` ) ).split( '\n' ).filter( line => line.includes( 'refs/heads/' ) ).map( line => {
    return line.match( /refs\/heads\/(.*)/ )[ 1 ].trim();
  } );
};
