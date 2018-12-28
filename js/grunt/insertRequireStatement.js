// Copyright 2015, University of Colorado Boulder

/**
 * Inserts a require statement in the given file
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

'use strict';

const assert = require( 'assert' ); // eslint-disable-line require-statement-match
const fs = require( 'fs' );
const grunt = require( 'grunt' );
const sortRequireStatements = require( './sortRequireStatements' );

const KEY = ' = require( '; // the substring that is searched to find require statements

/**
 * @param {string} file
 * @param {string} name
 */
module.exports = function( file, name ) {

  assert && assert( file, 'file should be defined' );
  assert && assert( name, 'name should be defined' );

  let activeSims = fs.readFileSync( '../perennial/data/active-repos' ).toString();
  activeSims = activeSims.split( /\r?\n/ );
  activeSims.length = activeSims.length - 1;

  const simulationRoot = process.cwd();

  let statement = null;
  try {

    // Search over all active sims for a require statement that matches the desired one
    for ( let k = 0; k < activeSims.length; k++ ) {
      const simPath = simulationRoot + '/../' + activeSims[ k ] + '/js';
      if ( grunt.file.exists( simPath ) ) {
        grunt.file.recurse( simPath, function( absolutePath ) {
          const t = grunt.file.read( absolutePath, 'utf8' );
          const index = t.indexOf( 'const ' + name + ' = require( \'' );
          if ( index >= 0 ) {
            const nextEndLine = t.indexOf( '\n', index );
            const substring = t.substring( index, nextEndLine );

            // poor man's way out of recursion
            throw substring;
          }
        } );
      }
    }
  }
  catch( x ) {

    // poor man's way out of recursion
    console.log( x );
    statement = x;
  }

  if ( !statement ) {
    grunt.log.warn( 'no import found for ' + name );
  }
  else {

    // read the file as text
    const text = grunt.file.read( file ).toString();

    // split by line
    const lines = text.split( /\r?\n/ );

    // full text
    const result = [];
    let inserted = false;

    for ( let i = 0; i < lines.length; i++ ) {
      const line = lines[ i ];

      // If it was a require statement, store it for sorting.
      if ( line.indexOf( KEY ) >= 0 && !inserted ) {
        result.push( '  ' + statement );
        inserted = true;
      }
      result.push( line );
    }

    grunt.file.write( file, result.join( '\n' ) );
    grunt.log.writeln( 'inserted a require statements in ' + file );

    // Make sure it ends up in the right place
    sortRequireStatements( file );
  }
};