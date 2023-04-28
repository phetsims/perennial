// Copyright 2022, University of Colorado Boulder

/**
 * Returns a list of simulation repos that have been published (does NOT include prototypes)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const simMetadata = require( './simMetadata' );
const simPhetioMetadata = require( './simPhetioMetadata' );
const _ = require( 'lodash' );

/**
 * Returns a list of simulation repos that have been published (does NOT include prototypes)
 * @public
 *
 * @returns {Promise<Array.<string>>}
 */
module.exports = async function() {
  const publishedRepos = [];

  const metadata = await simMetadata( {
    includePrototypes: false
  } );
  metadata.projects.forEach( projectData => {
    if ( projectData.name.startsWith( 'html/' ) ) {
      publishedRepos.push( projectData.name.substring( 'html/'.length ) );
    }
  } );

  ( await simPhetioMetadata( {
    active: true,
    latest: true
  } ) ).filter( simData => simData.active && simData.latest ).forEach( simData => {
    publishedRepos.push( simData.name );
  } );

  return _.uniq( publishedRepos ).sort();
};
