// Copyright 2017, University of Colorado Boulder

/**
 * Returns a list of repositories actively handled by tooling for PhET
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const fs = require( 'fs' );

/**
 * Returns a list of repositories actively handled by tooling for PhET
 * @public
 *
 * @returns {Array.<string>}
 */
module.exports = function( repo ) {
  const contents = fs.readFileSync( '../perennial/data/active-repos', 'utf8' ).trim();

  // Trim will remove any spaces and carriage returns if they are present.
  return contents.split( '\n' ).map( sim => sim.trim() );
};
