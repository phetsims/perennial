// Copyright 2023, University of Colorado Boulder

/**
 * Returns a list of repositories (that can be run) actively handled by tooling for PhET
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getRepoList = require( './getRepoList' );

/**
 * Returns a list of repositories (that can be run) actively handled by tooling for PhET
 * @public
 *
 * @returns {Array.<string>}
 */
module.exports = function() {
  return getRepoList( 'active-runnables' );
};