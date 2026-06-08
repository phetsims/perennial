// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns metadata from the production website
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { Locale, Sim } from '../browser-and-node/PerennialTypes.js';
import _ from 'lodash';
import winston from 'winston';
import axios from 'axios';

type SimMetadataOptions = {
  summary: boolean;
  type: string | null;
  locale: Locale | null;
  simulation: Sim | null;
  includePrototypes: boolean;
};

type ProjectType = {
  name: Sim;
  id: number;
  version: {
    string: string;
    major: number;
    minor: number;
    dev: number;
    timestamp: number;
  };
};
export type SimMetadata = {
  projects: ProjectType[];
};

/**
 * Returns metadata from the production website.
 */
async function simMetadata( providedOptions?: Partial<SimMetadataOptions> ): Promise<SimMetadata> {
  const options = _.assignIn( {
    summary: true, // {boolean} - If set, will include a reduced amount of data for every included simulation
    type: 'html', // {string|null} - If provided (html/java/flash), will limit results to a specific type of simulation
    locale: null, // {string|null} - If provided, will limit results to a specific locale
    simulation: null, // {string|null} - If provided, will limit to a specific simulation simulation
    includePrototypes: true // {boolean} - If set, will include prototypes
  }, providedOptions );

  let metadataURL = 'https://phet.colorado.edu/services/metadata/1.3/simulations?format=json';
  if ( options.summary ) {
    metadataURL += '&summary';
  }
  if ( options.includePrototypes ) {
    metadataURL += '&includePrototypes';
  }
  if ( options.type ) {
    metadataURL += `&type=${options.type}`;
  }
  if ( options.locale ) {
    metadataURL += `&locale=${options.locale}`;
  }
  if ( options.simulation ) {
    metadataURL += `&simulation=${options.simulation}`;
  }

  winston.debug( `getting metadata request with ${metadataURL}` );

  const response = await axios( metadataURL );
  if ( response.status !== 200 ) {
    throw new Error( `metadata request failed with status ${response.status}` );
  }
  else {
    return response.data;
  }
}

export default simMetadata;