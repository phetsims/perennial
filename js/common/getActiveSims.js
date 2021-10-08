// Copyright 2017, University of Colorado Boulder

/**
 * Returns a list of simulation repositories actively handled by tooling for PhET
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getRepoList = require( './getRepoList' );

/**
 * Returns a list of simulation repositories actively handled by tooling for PhET
 * @public
 *
 * @returns {Array.<string>}
 */
module.exports = function() {
  return getRepoList( 'active-sims' );
};
