// Copyright 2024, University of Colorado Boulder

// TODO: Do these maintenance entry points belong in grunt? See https://github.com/phetsims/chipper/issues/1461
grunt.registerTask( 'maintenance', 'Starts a maintenance REPL', wrapTask( async () => {
  import Maintenance from '../../common/Maintenance';

  await Maintenance.startREPL();
} ) );
