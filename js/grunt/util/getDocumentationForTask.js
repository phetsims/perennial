// Copyright 2024, University of Colorado Boulder
const fs = require( 'fs' );

/**
 * Parse jsdoc for documentation for a task.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
module.exports = file => {
  const source = fs.readFileSync( file, { encoding: 'utf-8' } );
  if ( source.includes( '/**' ) && source.includes( '*/' ) ) {
    const myDoc = source.substring( source.indexOf( '/**' ) + '/**'.length, source.indexOf( '*/' ) );
    const lines = myDoc.split( '\n' );
    const docLines = lines.map( line => line.trim().replace( /^\*\s*/, '' ) ).filter( line => line !== '*' && !line.startsWith( '@author' ) );

    // while the first line is empty, remove it
    while ( docLines.length > 0 && docLines[ 0 ].trim().length === 0 ) {
      docLines.shift();
    }

    // while the last line is empty, remove it
    while ( docLines.length > 0 && docLines[ docLines.length - 1 ].trim().length === 0 ) {
      docLines.pop();
    }

    return docLines.join( '\n' );
  }
  else {
<<<<<<< HEAD
    return 'No documentation';
=======
    return 'No documentation found';
>>>>>>> 564c3db (move grunt util functions for perennial, https://github.com/phetsims/chipper/issues/1464)
  }
};