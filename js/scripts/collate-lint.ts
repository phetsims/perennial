// Copyright 2022, University of Colorado Boulder

/**
 * This script uses Deno and is run like so:
 *
 * grunt lint-everything > lintreport.txt
 * deno run --allow-read js/scripts/collate-lint.ts
 *
 * It counts failures of each rule
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
( () => {

  const text: string = Deno.readTextFileSync( './lintreport.txt' );

  const lines: string[] = text.split( '\n' );
  let keys: string[] = [];
  lines.forEach( line => {
    if ( line.includes( '@typescript-eslint/' ) ) {
      const key = line.substring( line.indexOf( '@typescript-eslint/' ) );
      if ( !keys.includes( key ) ) {
        keys.push( key );
      }
    }
  } );
  console.log( keys );
  keys = keys.sort();

  keys.forEach( key => {
    let count = 0;
    lines.forEach( line => {
      if ( line.includes( key ) ) {
        count++;
      }
    } );
    console.log( key, count );
  } );
} )();

export {};