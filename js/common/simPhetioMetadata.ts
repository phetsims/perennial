// Copyright 2018, University of Colorado Boulder

/**
 * Returns phet-io metadata from the production website
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

import axios from 'axios';
import _ from 'lodash';
import winston from 'winston';

type SimPhetioMetadataOptions = {
  active: boolean | null;
  latest: boolean | null;
};

type SimPhetioMetadata = {
  versionMaintenance: number;
  name: string;
  active: boolean;
  versionMajor: number;
  versionMinor: number;
  versionSuffix: string;
  latest: boolean;
  timestamp: string;
};

async function simPhetioMetadata( providedOptions?: Partial<SimPhetioMetadataOptions> ): Promise<SimPhetioMetadata[]> {
  const options = _.assignIn( {
    active: null, // {boolean|null} - If set, will only include active branches
    latest: null // {boolean|null} - If set, will only include latest branches
  }, providedOptions );

  let metadataURL = 'https://phet.colorado.edu/services/metadata/phetio?';
  if ( options.active !== null ) {
    metadataURL += `&active=${options.active}`;
  }
  if ( options.latest !== null ) {
    metadataURL += `&latest=${options.latest}`;
  }

  winston.info( `getting phet-io metadata request with ${metadataURL}` );
  let response;
  try {
    response = await axios( metadataURL );
  }
  catch( e ) {
    throw new Error( `metadata request failed with ${e}` );
  }

  if ( response.status !== 200 ) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    throw new Error( `metadata request failed with status ${response.status} ${response}` );
  }
  else {
    return response.data;
  }
}

export default simPhetioMetadata;