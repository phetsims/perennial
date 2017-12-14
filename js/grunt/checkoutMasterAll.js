// Copyright 2002-2015, University of Colorado Boulder

/**
 * This grunt task checks out master for all sims. Useful in some cases where different shas with conflicting dependencies are checked out.
 */
/* eslint-env node */
'use strict';

const _ = require( 'lodash' ); // eslint-disable-line
const child_process = require( 'child_process' );
const grunt = require( 'grunt' );

/**
 * Checks out master for all repositories in the git root directory.
 * @public
 */
module.exports = function() {

  const command = 'git checkout master';
  const done = grunt.task.current.async();

  const gitRoots = grunt.file.expand( { cwd: '..' }, '*' );
  const finished = _.after( gitRoots.length, done );

  for ( var i = 0; i < gitRoots.length; i++ ) {
    const filename = gitRoots[ i ]; // Don't change to var without rewrapping usages in the closure
    if ( filename !== 'babel' && grunt.file.isDir( '../' + filename ) && grunt.file.exists( '../' + filename + '/.git' ) ) {
      child_process.exec( command, { cwd: '../' + filename }, function( error ) {
        if ( error ) {
          grunt.log.writeln( 'error in ' + command + ' for repo ' + filename );
        }
        finished();
      } );
    }
    else {
      finished();
    }
  }
};