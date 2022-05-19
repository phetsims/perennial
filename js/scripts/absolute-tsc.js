// Copyright 2022, University of Colorado Boulder

/**
 * The tsc type checker outputs type error using relative paths only, which are not hyperlinked in WebStorm and IntelliJ.
 * This thin wrapper uses a heuristic to convert the relative paths to absolute paths.  Combined with an "output filter",
 * this makes the type errors clickable in the tool output panel.
 *
 * Configure WebStorm with the following external tool:
 * program: node
 * arguments: perennial/js/scripts/absolute-tsc.js ${dir with a tsconfig, like chipper/tsconfig/all} ${path to replace, like ../../../}
 * working dir: ${the root of the checkout, like /Users/samreid/apache-document-root/main/}
 *
 * IMPORTANT!!! This makes the files paths clickable in Webstorm:
 * output filters: $FILE_PATH$\($LINE$\,$COLUMN$\)
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
const start = Date.now();
const execute = require( '../common/execute' );
const path = require( 'path' );

const args = process.argv.slice( 2 );
if ( !args || args.length === 0 ) {
  console.log( 'usage: path to dir with a tsconfig file' );
}

( async () => {
  const results = await execute( 'node', [ `${args[ 1 ]}/chipper/node_modules/typescript/bin/tsc` ], args[ 0 ], {
    errors: 'resolve'
  } );

  // If there was a problem running tsc, report it here.  The type errors are reported on stdout below.
  if ( results.stderr.length > 0 ) {
    console.log( results );
  }
  const end = Date.now();
  const elapsed = end - start;

  if ( results.stdout.trim().length === 0 ) {

    console.log( `0 errors in ${elapsed}ms` );
  }
  else {
    const lines = results.stdout.trim().split( '\n' );
    const mapped = lines.map( line => {

      return line.trim().split( args[ 1 ] ).join( process.cwd() + path.sep ).split( '/' ).join( path.sep );
    } );

    console.log( mapped.join( '\n' ) );
    console.log( `${mapped.length} ${mapped.length === 1 ? 'error' : 'errors'} in ${elapsed}ms` );
  }
} )();
