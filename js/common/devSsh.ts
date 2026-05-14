// Copyright 2017-2026, University of Colorado Boulder

/**
 * Executes a command on the dev server
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { buildLocal } from './buildLocal.js';
import { ssh } from './ssh.js';

export const devSsh = ( cmd: string ): Promise<string> => {
  return ssh( buildLocal.devUsername, buildLocal.devDeployServer, cmd );
};
