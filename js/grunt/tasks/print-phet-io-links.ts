// Copyright 2024, University of Colorado Boulder

grunt.registerTask( 'print-phet-io-links',
  'Print the current list of all phet-io sims\' links',
  wrapTask( async () => {
    import getPhetioLinks from '../../common/getPhetioLinks';
    const phetioLinks = await getPhetioLinks();

    console.log( 'Latest Links:' );
    console.log( `\n${phetioLinks.join( '\n' )}` );
  } ) );