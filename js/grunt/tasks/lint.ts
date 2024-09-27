// Copyright 2024, University of Colorado Boulder
import assert from 'assert';

grunt.registerTask( 'lint', 'Lints this repository only', wrapTask( async () => {
  import execute from '../../common/execute';
  import gruntCommand from '../../common/gruntCommand';

  const index = process.argv.indexOf( 'lint' );
  assert && assert( index >= 0, 'lint command does not appear' );
  const tail = process.argv.slice( index + 1 );

  if ( !getOption( 'repos' ) ) {
    tail.push( '--repos=perennial' );
  }

  // Forward to chipper, supporting all of the options
  grunt.log.writeln( ( await execute( gruntCommand, [ 'lint', ...tail ], '../chipper', { errors: 'resolve' } ) ).stdout );
} ) );