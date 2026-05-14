// Copyright 2026, University of Colorado Boulder

/**
 * Maintenance preload script for the REPL (sets up the REPL environment with the things we need)
 *
 * node --import tsx --import ./js/common/maintenance/maintenance-preload.ts -i
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { Checkout } from '../Checkout.js';
import { Maintenance } from './Maintenance.js';
import { ReleaseBranch } from '../ReleaseBranch.js';
import winston from 'winston';

winston.default.transports.console.level === 'info';

// @ts-expect-error
global.Checkout = Checkout;
// @ts-expect-error
global.Maintenance = Maintenance;
// @ts-expect-error
global.ReleaseBranch = ReleaseBranch;

// TODO: expose Maintenance once that is running
