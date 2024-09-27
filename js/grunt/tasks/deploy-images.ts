// Copyright 2024, University of Colorado Boulder

grunt.registerTask( 'deploy-images',
  'Rebuilds all images\n' +
  '--simulation : Optional. If present, only the given simulation will receive images from main. If absent, all sims' +
  'will receive images from main.',

  wrapTask( async () => {
    console.log( getOption( 'simulation' ) );
    const simulation = getOption( 'simulation' ) || null;
    import deployImages from '../deployImages';
    await deployImages( { simulation: simulation } );
  } ) );