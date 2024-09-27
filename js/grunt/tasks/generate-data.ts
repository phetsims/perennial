// Copyright 2024, University of Colorado Boulder

// TODO: Does this belong in grunt? See https://github.com/phetsims/chipper/issues/1461
grunt.registerTask( 'generate-data', 'Generates the lists under perennial/data/, and if there were changes, will commit and push.', wrapTask( async () => {
  import generateData from '../generateData';
  await generateData( grunt );
} ) );