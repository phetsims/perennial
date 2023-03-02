// Copyright 2021, University of Colorado Boulder

/**
 * Lints and typechecks, reporting any errors
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( '../common/execute' );
const gruntCommand = require( '../common/gruntCommand' );
const winston = require( 'winston' );

winston.default.transports.console.level = 'error';

// ANSI escape sequences to move to the right (in the same line) or to apply or reset colors
const red = '\u001b[31m';
const green = '\u001b[32m';
const reset = '\u001b[0m';

( async () => {

  // {code:number,stdout:string,stderr:string}
  let lintResults = null;
  let tscResults = null;

  const outputResult = ( name, results ) => {
    if ( results.code === 0 ) {
      console.log( `${green}${name} OK${reset}` );
    }
    else {
      console.log( `${red}${name} FAIL${reset}` );

      if ( results.stdout.trim().length > 0 ) {
        console.log( results.stdout );
      }
      if ( results.stderr.trim().length > 0 ) {
        console.log( results.stderr );
      }
    }
  };

  const runLint = async () => {
    lintResults = await execute( gruntCommand, [ 'lint-everything' ], '../perennial', {
      errors: 'resolve'
    } );
    outputResult( 'lint', lintResults );
  };

  const runTsc = async () => {
    tscResults = await execute( '../../node_modules/typescript/bin/tsc', [], '../chipper/tsconfig/all', {
      errors: 'resolve'
    } );
    outputResult( 'tsc', tscResults );
  };

  await Promise.all( [ runLint(), runTsc() ] );

  console.log( `\n${lintResults.code === 0 && tscResults.code === 0 ? green : red}-----=====] finished [=====-----${reset}\n` );
} )();
