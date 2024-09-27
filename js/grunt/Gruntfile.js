// Copyright 2002-2015, University of Colorado Boulder

/**
 * Grunt configuration file for tasks that have no dependencies on other repos.
 * In particular, grunt checkout-shas and grunt checkout-main can be run from here
 * without worrying about an older version of chipper being checked out.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

require( './checkNodeVersion' );
const registerTasks = require( './util/registerTasks' );
const path = require( 'path' );

module.exports = function( grunt ) {
  if ( grunt.option( 'debug' ) ) {
    const winston = require( 'winston' );
    winston.default.transports.console.level = 'debug';
  }

  registerTasks( grunt, path.join( __dirname, 'tasks/' ) );
};