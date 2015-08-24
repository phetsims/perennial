// Copyright 2002-2015, University of Colorado Boulder

/**
 * This grunt task checks out master for all sims. Useful in some cases where different shas with conflicting dependencies are checked out.
 */
var assert = require( 'assert' );
var child_process = require( 'child_process' );

// 3rd-party packages
/* jshint -W079 */
var _ = require( '../../../sherpa/lib/lodash-2.4.1.min' ); // allow _ to be redefined, contrary to jshintOptions.js
/* jshint +W079 */

/**
 * @param grunt the grunt instance
 */
module.exports = function( grunt ) {
  'use strict';

  var command = 'git checkout master';
  var done = grunt.task.current.async();

  var gitRoots = grunt.file.expand( { cwd: '..' }, '*' );
  var finished = _.after( gitRoots.length, done );

  for ( var i = 0; i < gitRoots.length; i++ ) {
    var filename = gitRoots[ i ];
    if ( filename !== 'babel' && grunt.file.isDir( '../' + filename ) && grunt.file.exists( '../' + filename + '/.git' ) ) {
      (function( filename ) {
        child_process.exec( command, { cwd: '../' + filename }, function( error ) {
          if ( error ) {
            grunt.log.writeln( 'error in ' + command + ' for repo ' + filename );
          }
          finished();
        } );
      })( filename );
    }
    else {
      finished();
    }
  }
};