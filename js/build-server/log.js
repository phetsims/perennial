// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const dateformat = require( 'dateformat' );
const winston = require( 'winston' );
const Loggly = require( 'winston-loggly' ).Loggly; // eslint-disable-line
const loggly_options = { subdomain: 'build-server', inputToken: 'none' }

winston.add( Loggly, loggly_options );

// add timestamps to log messages
winston.remove( winston.transports.Console );
winston.add( winston.transports.Console, {
  'timestamp': function() {
    return dateformat( new Date(), 'mmm dd yyyy HH:MM:ss Z' );
  }
} );

module.exports = winston;