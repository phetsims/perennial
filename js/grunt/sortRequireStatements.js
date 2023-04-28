// Copyright 2015, University of Colorado Boulder

/**
 * Sorts require statements for each file in the js/ directory
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

// 3rd-party packages
const _ = require( 'lodash' );
const grunt = require( 'grunt' );

// constants
const KEY = ' = require( '; // the substring that is searched to find require statements

/**
 * @param {string} path
 */
module.exports = function( path ) {

  // only address js files
  if ( path.indexOf( '.js' ) ) {

    // read the file as text
    const text = grunt.file.read( path ).toString();

    // split by line
    const lines = text.split( /\r?\n/ );

    // full text
    const result = [];

    // accumulated require statement lines
    let accumulator = [];

    // total number of require statements
    let count = 0;

    for ( let i = 0; i < lines.length; i++ ) {
      const line = lines[ i ];

      // If it was a require statement, store it for sorting.
      if ( line.indexOf( KEY ) >= 0 ) {
        accumulator.push( line );
        count++;
      }
      else {

        // Not a require statement, sort and flush any pending require statements then continue
        accumulator = _.sortBy( accumulator, o => {

          // sort by the beginning of the line, including 'const X = require("PATH/dir/X")
          // case insensitive so that inherit and namespaces don't show up last
          return o.toLowerCase();
        } );
        let previous = null;
        accumulator.forEach( a => {

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
    grunt.log.writeln( `sorted ${count} require statements in ${path}` );
  }
};