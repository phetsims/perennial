// Copyright 2020, University of Colorado Boulder

/**
 * Returns a list of repositories based on data in perennial/data.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const fs = require( 'fs' );

/**
 * Returns a list of repositories based on data in perennial/data.
 * @public
 *
 * @param {string} name - The name of the list
 * @returns {Array.<string>}
 */
module.exports = function( name ) {
  const contents = fs.readFileSync( `../perennial/data/${name}`, 'utf8' ).trim();

  // Trim will remove any spaces and carriage returns if they are present.
  return contents.split( '\n' ).map( sim => sim.trim() );
};
