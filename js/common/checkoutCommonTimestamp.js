// Copyright 2018, University of Colorado Boulder

/**
 * Checks out a snapshot of common code repos for a given timestamp/branch.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const _ = require( 'lodash' );
const gitFetchCheckout = require( './gitFetchCheckout.js' );
const gitFromTimestamp = require( './gitFromTimestamp.js' );
const getRepoList = require( './getRepoList.js' );
const npmUpdate = require( './npmUpdate.js' );
const winston = require( 'winston' );

/**
 * Checks out a snapshot of a repo (and its dependencies) for a given timestamp/branch.
 * @public
 *
 * @param {string} timestamp
 * @param {boolean} includeNpmUpdate
 * @returns {Promise.<void>}
 */
module.exports = async function( timestamp, includeNpmUpdate ) {

  const repos = _.uniq( [
    ...getRepoList( 'active-common-sim-repos' ),
    'assert',
    'brand',
    'joist',
    'query-string-machine',
    'sherpa',
    'utterance-queue',
    'phet-core',
    'tandem',
    'axon',
    'dot',
    'kite',
    'scenery',
    'scenery-phet',
    'sun',
    'twixt',
    'phetcommon',
    'phet-lib',
    'chipper',
    'perennial-alias',
    'phetmarks'
  ] ).sort();

  for ( const repo of repos ) {
    winston.info( repo );

    try {
      const sha = await gitFromTimestamp( repo, 'main', timestamp );
      await gitFetchCheckout( repo, sha );
    }
    catch( e ) {
      winston.error( `skipping ${repo}: ${e}` );
    }
  }

  if ( includeNpmUpdate ) {
    await npmUpdate( 'chipper' );
    await npmUpdate( 'perennial-alias' );
  }
};