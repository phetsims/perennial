// Copyright 2017-2026, University of Colorado Boulder

/**
 * retrieve the contents of a file without changing the git tree via checkouts.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitImmutableExecute } from './gitMutex.js';

/**
 * Gets the contents of the file at a given state in the git tree
 *
 * @param file - Path to the file from the repo root, like js/myFile.js
 * @param branchOrSha - what revision to get the contents of the file at. "buoyancy-1.0" or "main" or
 *                               "{{SHA}}". Defaults to the current checkout (HEAD)
 * @returns Stdout
 * @rejects {ExecuteError}
 */
export const gitCatFile = async(
  file: string,
  branchOrSha = 'HEAD'
): Promise<string> => {
  return gitImmutableExecute( [ 'cat-file', 'blob', `${branchOrSha}:${file}` ], '..' );
};
