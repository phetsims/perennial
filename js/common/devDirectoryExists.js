// Copyright 2017, University of Colorado Boulder

/**
 * Checks to see whether a directory on the dev server exists.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const devSsh = require( './devSsh' );

/**
 * Checks to see whether a directory on the dev server exists.
 * @public
 *
 * @param {string} directory
 * @returns {Promise} - Resolves to a boolean of whether the directory exists
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
  } );
};
