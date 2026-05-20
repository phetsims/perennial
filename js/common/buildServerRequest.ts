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
import { LegacyBranch, Repo, SHA } from '../browser-and-node/PerennialTypes.js';
import { BuildServerRequest } from '../build-server/BuildServerRequest.js';

export type BuildServerRequestOptions = {
  locales?: string[] | '*'; // TODO: figure out the type we need to send in.
  servers?: string[];
};

export const buildServerRequest = async (
  repo: Repo,
  version: SimVersion,
  legacyBranch: LegacyBranch,
  brands: string[],
  totalitySHA: SHA,
  options?: BuildServerRequestOptions
): Promise<void> => {
  const locales = options?.locales ?? '*';
  const servers = options?.servers ?? [ 'dev' ];

  winston.info( `sending build request for ${repo} ${version.toString()} with totality SHA: ${totalitySHA}` );

  servers.forEach( server => assert( [ 'dev', 'production' ].includes( server ), `Unknown server: ${server}` ) );

  const requestObject: BuildServerRequest = {
    api: '3.0',
    simName: repo,
    version: version.toString(),
    locales: locales,
    servers: servers,
    brands: brands,
    branch: legacyBranch,
    totalitySHA: totalitySHA,
    authorizationCode: buildLocal.buildServerAuthorizationCode
  };
  if ( buildLocal.buildServerNotifyEmail ) {
    requestObject.email = buildLocal.buildServerNotifyEmail;
  }

  const url = `${buildLocal.productionServerURL}/deploy-html-simulation`;

  winston.info( url );
  winston.info( JSON.stringify( requestObject ) );

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