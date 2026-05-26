// Copyright 2022-2026, University of Colorado Boulder

/**
 * Returns a list of simulation repos that have been published (does NOT include prototypes)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import simMetadata from './simMetadata.js';
import simPhetioMetadata from './simPhetioMetadata.js';
import _ from 'lodash';
import { Sim } from '../browser-and-node/PerennialTypes.js';

export const getPublishedSims = async (): Promise<Sim[]> => {
  const publishedSims: string[] = [];

  const metadata = await simMetadata( {
    includePrototypes: false
  } );
  metadata.projects.forEach( projectData => {
    if ( projectData.name.startsWith( 'html/' ) ) {
      publishedSims.push( projectData.name.substring( 'html/'.length ) );
    }
  } );

  ( await simPhetioMetadata( {
    active: true,
    latest: true
  } ) ).filter( simData => simData.active && simData.latest ).forEach( simData => {
    publishedSims.push( simData.name );
  } );

  return _.uniq( publishedSims ).sort();
};
