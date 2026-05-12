// Copyright 2017-2026, University of Colorado Boulder

/**
 * Transfers a file (or directory recursively) to the dev server
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { buildLocal } from './buildLocal.js';
import { scp } from './scp.js';

/**
 * Transfers a file (or directory recursively) to the dev server
 * @public
 *
 * @param localFile - A file, directory or glob pattern. Basically the first part of the SCP command
 * @param remoteFile - A file or directory. Basically the second part of the SCP command (minus the host/username)
 * @returns - Stdout
 * @rejects {ExecuteError}
 */
export const devScp = async ( localFile: string, remoteFile: string ): Promise<string> => {
  return scp( buildLocal.devUsername, buildLocal.devDeployServer, localFile, remoteFile );
};
