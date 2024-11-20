// Copyright 2002-2024, University of Colorado Boulder

'use strict';

require( './js/grunt/commonjs/checkNodeVersion' );
const registerTasks = require( './js/grunt/commonjs/registerTasks.js' );

module.exports = function( grunt ) {
  if ( grunt.option( 'debug' ) ) {
    const winston = require( 'winston' );
    winston.default.transports.console.level = 'debug';
  }
  registerTasks( grunt, `${__dirname}/js/grunt/tasks/` );
};