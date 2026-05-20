// Copyright 2017-2026, University of Colorado Boulder

/**
 * git pull (assuming perennial-alias directory cwd)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitPullDirectory } from './gitPullDirectory.js';

export const gitPull = async (): Promise<string> => gitPullDirectory( '..' );
