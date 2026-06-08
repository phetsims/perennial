// Copyright 2017-2026, University of Colorado Boulder

/**
 * Sends a request to the build server.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { buildLocal } from './buildLocal.js';
import assert from 'assert';
import axios from 'axios';
import winston from 'winston';
import SimVersion from '../browser-and-node/SimVersion.js';
import { BranchVersion, BuildServerRequest, BuildServerTarget, LocalesStringSpecifier, SHA, Sim, SupportedBuildServerBrand } from '../browser-and-node/PerennialTypes.js';

export type BuildServerRequestOptions = {
  locales?: LocalesStringSpecifier;
  servers?: BuildServerTarget[];
};

export const buildServerRequest = async (
  sim: Sim,
  version: SimVersion,
  branchVersion: BranchVersion,
  brands: SupportedBuildServerBrand[],
  totalitySHA: SHA,
  options?: BuildServerRequestOptions
): Promise<void> => {
  if ( brands.length === 0 ) {
    throw new Error( 'At least one brand must be specified for a build server request.' );
  }

  const locales = options?.locales ?? '*';
  const servers = options?.servers ?? [ 'dev' ] as const;

  winston.info( `sending build request for ${sim} ${version.toString()} with totality SHA: ${totalitySHA}` );

  servers.forEach( server => assert( [ 'dev', 'production' ].includes( server ), `Unknown server: ${server}` ) );

  const requestObject: BuildServerRequest = {
    api: '3.0',
    simName: sim,
    versionString: version.toString(),
    locales: locales,
    servers: servers,
    brands: brands,
    branchVersion: branchVersion,
    totalitySHA: totalitySHA,
    authorizationCode: buildLocal.buildServerAuthorizationCode
  };
  if ( buildLocal.buildServerNotifyEmail ) {
    requestObject.email = buildLocal.buildServerNotifyEmail;
  }

  const url = `${buildLocal.productionServerURL}/deploy-html-simulation`;

  winston.info( url );
  winston.info( JSON.stringify( {
    // eslint-disable-next-line phet/no-object-spread-on-non-literals
    ...requestObject,
    authorizationCode: 'REDACTED_FOR_LOGGING'
  } ) );

  let response;
  try {
    response = await axios( { method: 'POST', url: url, data: requestObject } );
  }
  catch( error ) {
    throw new Error( `Build request failed with error ${error}.` );
  }
  if ( response.status !== 200 && response.status !== 202 ) {
    throw new Error( `Build request failed with error ${response.status}.` );
  }
  else {
    winston.info( 'Build request sent successfully' );
  }
};