// Copyright 2017, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)


/**
 * Source: https://stackoverflow.com/a/17737613/2496827
 */

const constants = require( './constants' );
const winston = require( 'winston' );
const Loggly = require( 'winston-loggly' ).Loggly; // eslint-disable-line phet/no-property-in-require-statement

const loggly_options = { subdomain: 'build-server', inputToken: 'none' };

winston.add( Loggly, loggly_options );

// add timestamps to log messages
winston.remove( winston.transports.Console );
winston.add( winston.transports.Console, {
  level: constants.BUILD_SERVER_CONFIG.verbose ? 'debug' : 'info'
} );

module.exports = winston;