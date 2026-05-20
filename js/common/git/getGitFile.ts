// Copyright 2023-2026, University of Colorado Boulder

/**
 * Gets the contents of a file at a specific git branch/SHA/object
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { gitImmutableExecute } from './gitMutex.js';

/**
 * Gets the contents of a file at a specific git branch/SHA/object
 *
 * TODO: see if we can remove this, we have the branched form which seems better https://github.com/phetsims/totality/issues/140
 *
 * @param gitObject - The branch/SHA/object name
 * @param filename - The filename - relative to the root of the repository
 * @returns- Resolves to the file content
 * @rejects {ExecuteError}
 */
export const getGitFile = async function( gitObject: string, filename: string ): Promise<string> {
  return gitImmutableExecute( [ 'show', `${gitObject}:./${filename}` ], '..' );
};
