// Copyright 2017-2026, University of Colorado Boulder

/**
 * Source: https://stackoverflow.com/a/17737613/2496827
 *
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import constants from './constants.js';
import winston from 'winston';
// @ts-expect-error - no types available for winston-loggly
import winstonLoggly from 'winston-loggly';

winston.add( winstonLoggly.Loggly, { subdomain: 'build-server', inputToken: 'none' } );

// add timestamps to log messages
winston.remove( winston.transports.Console );
winston.add( winston.transports.Console, {
  level: constants.BUILD_SERVER_CONFIG.verbose ? 'debug' : 'info'
} );

export default winston;
