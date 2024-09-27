// Copyright 2024, University of Colorado Boulder

grunt.registerTask( 'sha-check',
  'Checks which simulations\' latest release version includes the given common-code SHA in its git tree.\n' +
  '--repo : repository to check for the SHA\n' +
  '--sha : git SHA',
  wrapTask( async () => {
    const repo = getOption( 'repo' );
    assertIsValidRepoName( repo );

    import shaCheck from '../shaCheck';

    await shaCheck( repo, getOption( 'sha' ) );
  } ) );