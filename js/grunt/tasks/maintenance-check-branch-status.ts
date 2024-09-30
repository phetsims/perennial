// Copyright 2024, University of Colorado Boulder

/**
 * Reports out on release branch statuses
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import winston from 'winston';
import Maintenance from '../../common/Maintenance';

winston.default.transports.console.level = 'error';

( async () => Maintenance.checkBranchStatus() )();