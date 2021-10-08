// Copyright 2018, University of Colorado Boulder

/**
 * Checks whether access to the dev server is available (usually unavailable if not on VPN or on campus)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const devSsh = require( './devSsh' );

/**
 * Checks whether access to the dev server is available (usually unavailable if not on VPN or on campus)
 * @public
 *
 * @returns {Promise.<boolean>} - Whether the directory exists
 */
module.exports = async function() {
  try {
    await devSsh( 'ls' );
    return true;
  }
  catch( e ) {
    return false;
  }
};
