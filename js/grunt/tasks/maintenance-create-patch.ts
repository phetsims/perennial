// Copyright 2024, University of Colorado Boulder

grunt.registerTask( 'maintenance-check-branch-status', 'Reports out on release branch statuses', wrapTask( async () => {
  import Maintenance from '../../common/Maintenance';
  import winston from 'winston';

  winston.default.transports.console.level = 'error';

  await Maintenance.checkBranchStatus();
} ) );