// Copyright 2021, University of Colorado Boulder

/**
 * Generally a "one-stop shop" for all things needed to update the PhET Codebase. See js/common/sync for detailed doc.
 *
 * usage:
 * grunt sync
 * ## or
 * cd perennial/
 * sage run js/grunt/tasks/sync.ts
 *
 * Common use cases:
 * Pull all repos:
 *      grunt sync --status=false --npmUpdate=false --checkoutMain=false
 * Print status for all repos:
 *      grunt sync --npmUpdate=false --pull=false --logAll
 * Running on windows:
 *      grunt sync --slowPull
 *
 * NOTE: This will CHANGE THE CURRENT WORKING DIRECTORY temporarily while this is running
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import path from 'path';
import winston from 'winston';
import dirname from '../../common/dirname.js';
import { getSyncCLIOptions, sync } from '../../common/sync.js';

winston.default.transports.console.level = 'error';

( async () => {
  const previousCWD = process.cwd();
  // @ts-expect-error - until we have "type": "module" in our package.json
  const scriptDirectory = dirname( import.meta.url );
  process.chdir( path.join( scriptDirectory, '../../..' ) );

  const success = await sync( getSyncCLIOptions() );

  process.chdir( previousCWD );

  process.exitCode = success ? 0 : 1;
} )();