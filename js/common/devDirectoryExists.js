// Copyright 2017, University of Colorado Boulder

/**
 * Checks to see whether a directory on the dev server exists.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */


const devSsh = require( './devSsh' );

/**
 * Checks to see whether a directory on the dev server exists.
 * @public
 *
 * @param {string} directory
 * @returns {Promise.<boolean>} - Whether the directory exists
 */
module.exports = function( directory ) {
  return devSsh( `[[ -d "${directory}" ]] && echo exists || echo not` ).then( stdout => {
    if ( stdout.trim() === 'exists' ) {
      return true;
    }
    else if ( stdout.trim() === 'not' ) {
      return false;
    }
    else {
      throw new Error( `Problem determining whether a dev directory exists: ${directory}` );
    }
  } ).catch( reason => {
    if ( reason.stderr.includes( 'Connection timed out' ) ) {
      throw new Error( 'Cannot reach the dev server.  Check that you have an internet connection and that you are either on campus or on the VPN.' );
    }
    throw new Error( reason );
  } );
};
