// Copyright 2021, University of Colorado Boulder

const _ = require( 'lodash' ); // eslint-disable-line no-unused-vars
const fs = require( 'fs' );

/**
 *
 * Autofix missing accessibility modifiers. NOTE: This script is horribly inefficient, writing the same file over and over
 * N times, where N is the number of errors in that file.
 *
 * USAGE:
 * (1) Make sure you have a clean working copy
 * (2) cd directory-with-all-repos
 * (3) Generate a lint report and save it in a file
 *       cd axon
 *       grunt lint > lintreport.txt
 * (4) Run the script
 *       cd ..
 *       node perennial/js/scripts/add-accessibility-modifier axon/lintreport.txt private
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
( async () => {
  const args = process.argv.slice( 2 );
  const filename = args[ 0 ];
  const modifier = args[ 1 ];

  const report = fs.readFileSync( filename, 'utf8' ).trim();
  const lines = report.split( '\n' ).map( sim => sim.trim() );

  let currentFile = null;
  lines.forEach( line => {
    if ( line.endsWith( '.ts' ) && ( line.includes( '/' ) || line.includes( '\\' ) ) ) {
      currentFile = line;
    }
    else if ( line.includes( 'error' ) && line.endsWith( '@typescript-eslint/explicit-member-accessibility' ) ) {
      const substring = line.substring( 0, line.indexOf( 'error' ) );
      const terms = substring.trim().split( ':' );
      const lineNumber = Number( terms[ 0 ] );
      const column = Number( terms[ 1 ] );

      console.log( currentFile, lineNumber, column );

      const file = fs.readFileSync( currentFile, 'utf8' );
      const lines = file.split( '\n' );

      lines[ lineNumber - 1 ] = lines[ lineNumber - 1 ].substring( 0, column - 1 ) + modifier + ' ' + lines[ lineNumber - 1 ].substring( column - 1 );
      console.log( lines[ lineNumber - 1 ] );

      fs.writeFileSync( currentFile, lines.join( '\n' ) );
    }
  } );
} )();