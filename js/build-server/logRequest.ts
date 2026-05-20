// Copyright 2017-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import { Request } from 'express';
// eslint-disable-next-line phet/default-import-match-filename
import winston from './log.js';

export const logRequest = ( req: Request, type: 'query' | 'body' ): void => {
  // log the request, which is useful for debugging
  let requestBodyString = '';
  for ( const key in req[ type ] ) {
    if ( req[ type ].hasOwnProperty( key ) ) {
      requestBodyString += `${key}:${JSON.stringify( req[ type ][ key ] )}\n`;
    }
  }
  winston.log(
    'info',
    `deploy request received, original URL = ${req.protocol}://${req.get( 'host' )}${req.originalUrl}\n${requestBodyString}`
  );
};
