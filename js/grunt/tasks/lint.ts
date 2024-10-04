// Copyright 2024, University of Colorado Boulder

/**
 * Lints this repository only'
 * @author Michael Kauzmann (PhET Interactive Simulations)
 *
 */
import assert from 'assert';
import grunt from 'grunt';
import execute from '../../common/execute';
import gruntCommand from '../../common/gruntCommand';
import getOption from './util/getOption.ts';

( async () => {

  const index = process.argv.indexOf( 'lint' );
  assert( index >= 0, 'lint command does not appear' );
  const tail = process.argv.slice( index + 1 );

  if ( !getOption( 'repos' ) ) {
    tail.push( '--repos=perennial' );
  }

  // Forward to chipper, supporting all of the options
  // @ts-expect-error, remove in https://github.com/phetsims/perennial/issues/369
  grunt.log.writeln( ( await execute( gruntCommand, [ 'lint', ...tail ], '../chipper', { errors: 'resolve' } ) ).stdout );
} )();