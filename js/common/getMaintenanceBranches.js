// Copyright 2018, University of Colorado Boulder

/**
 * Gets a list of SimBranches which would be potential candidates for a maintenance release.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const fs = require( 'fs' );
const SimBranch = require( './SimBranch' );
const simMetadata = require( './simMetadata' );
const winston = require( 'winston' );

/**
 * Gets a list of SimBranches which would be potential candidates for a maintenance release.
 * @public
 *
 * @returns {Promise.<Array.<SimBranch>>}
 * @rejects {ExecuteError}
 */
module.exports = async function() {
  winston.debug( 'retrieving available sim branches' );

  const phetioBranchesJSON = JSON.parse( fs.readFileSync( '../perennial/data/phet-io-maintenance.json', 'utf8' ) );
  const phetioBranches = phetioBranchesJSON.simBranches.map( ( { repo, branch, brands } ) => new SimBranch( repo, branch, brands ) );

  const phetBranches = ( await simMetadata( {
    summary: true,
    type: 'html'
  } ) ).projects.map( simData => {
    let repo = simData.name.slice( simData.name.indexOf( '/' ) + 1 );
    let branch = simData.version.major + '.' + simData.version.minor;
    return new SimBranch( repo, branch, [ 'phet' ] );
  } );

  return SimBranch.combineLists( [ ...phetBranches, ...phetioBranches ] );
};
