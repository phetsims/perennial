// Copyright 2024, University of Colorado Boulder

grunt.registerTask( 'maintenance-list', 'Lists out the current maintenance process state', wrapTask( async () => {
  import Maintenance from '../../common/Maintenance';
  await Maintenance.list();
} ) );