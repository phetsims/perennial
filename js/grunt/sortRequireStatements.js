// Copyright 2015, University of Colorado Boulder

/**
 * Sorts require statements for each file in the js/ directory
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

// 3rd-party packages
const _ = require( 'lodash' ); // eslint-disable-line require-statement-match
const grunt = require( 'grunt' );

// constants
var KEY = ' = require( '; // the substring that is searched to find require statements

/**
 * @param {string} path
 */
module.exports = function( path ) {
  'use strict';

  // only address js files
  if ( path.indexOf( '.js' ) ) {

    // read the file as text
    var text = grunt.file.read( path ).toString();

    // split by line
    var lines = text.split( /\r?\n/ );

    // full text
    var result = [];

    // accumulated require statement lines
    var accumulator = [];

    // total number of require statements
    var count = 0;

    for ( var i = 0; i < lines.length; i++ ) {
      var line = lines[ i ];

      // If it was a require statement, store it for sorting.
      if ( line.indexOf( KEY ) >= 0 ) {
        accumulator.push( line );
        count++;
      }
      else {

        // Not a require statement, sort and flush any pending require statements then continue
        accumulator = _.sortBy( accumulator, function( o ) {

          // sort by the beginning of the line, including 'var X = require("PATH/dir/X")
          // case insensitive so that inherit and namespaces don't show up last
          return o.toLowerCase();
        } );
        var previous = null;
        accumulator.forEach( function( a ) {

          // Omit duplicate require statements
          if ( a !== previous ) {
            result.push( a );
          }

          previous = a;
        } );
        accumulator.length = 0;
        result.push( line );
      }
    }

    grunt.file.write( path, result.join( '\n' ) );
    grunt.log.writeln( 'sorted ' + count + ' require statements in ' + path );
  }
};