// Copyright 2017, University of Colorado Boulder

/**
 * Gets a mapping from branch name to branch SHA from the remote
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Gets a mapping from branch name to branch SHA from the remote
 * @public
 *
 * @param {string} repo - The repository name
 * @returns {Promise.<Object>} - Object map from branch => sha {string}
 * @rejects {ExecuteError}
 */
module.exports = async function( repo ) {
  winston.debug( `retrieving branches from ${repo}` );

  const map = {};

  ( await execute( 'git', [ 'ls-remote' ], `../${repo}` ) ).split( '\n' ).forEach( line => {
    const match = line.trim().match( /^(\S+)\s+refs\/heads\/(\S+)$/ );
    if ( match ) {
      map[ match[ 2 ] ] = match[ 1 ];
    }
  } );

  return map;
};
