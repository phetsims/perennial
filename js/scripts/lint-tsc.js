// Copyright 2021, University of Colorado Boulder

/**
 * Lints and typechecks, reporting any errors
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( '../common/execute' ).default;
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
  let typeCheckResults = null;

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
    lintResults = await execute( gruntCommand, [ 'lint', '--all' ], `${__dirname}/../../`, {
      errors: 'resolve'
    } );
    outputResult( 'lint', lintResults );
  };

  const runTsc = async () => {
    typeCheckResults = await execute( gruntCommand, [ 'type-check', '--all' ], `${__dirname}/../../`, {
      errors: 'resolve'
    } );
    outputResult( 'type-check', typeCheckResults );
  };

  // const runAPIChecks = async () => {
  //   lintResults = await execute( gruntCommand, [ 'compare-phet-io-api', '--stable' ], `${__dirname}/../../../chipper`, {
  //     errors: 'resolve'
  //   } );
  //   outputResult( 'compare-phet-io-api', lintResults );
  // };

  // await Promise.all( [ runLint(), runTsc(), runAPIChecks() ] );
  await Promise.all( [ runLint(), runTsc() ] );

  console.log( `\n${lintResults.code === 0 && typeCheckResults.code === 0 ? green : red}-----=====] finished [=====-----${reset}\n` );
} )();