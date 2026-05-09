// Copyright 2017-2026, University of Colorado Boulder

/**
 * Executes an effective "npm install", ensuring that the node_modules versions match package.json (and the lock file if present).
 *
 * NOTE: This will likely run `npm ci` on newer versions of things(!)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { npmUpdateDirectory, NPMUpdateOptions } from './npmUpdateDirectory.js';

export const npmUpdate = async ( repo: string, options?: NPMUpdateOptions ): Promise<void> => {
  return npmUpdateDirectory( `../${repo}`, options );
};