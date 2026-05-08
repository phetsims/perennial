// Copyright 2022-2026, University of Colorado Boulder

/**
 * Returns a list of simulation repos that have been published (does NOT include prototypes)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import simMetadata from './simMetadata.js';
import simPhetioMetadata from './simPhetioMetadata.js';
import _ from 'lodash';

export const getPublishedSims = async (): Promise<string[]> => {
  const publishedRepos: string[] = [];

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
