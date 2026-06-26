// Copyright 2026, University of Colorado Boulder

/**
 * Gets the given file from a totality branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { BranchOrSHA, IntentionalPerennialAny } from '../browser-and-node/PerennialTypes.js';
import { ensureLocalBranchFromRemote } from './ensureLocalBranchFromRemote.js';
import { gitCatFile } from './git/gitCatFile.js';
import { gitImmutableExecute } from './git/gitMutex.js';

export const getFileAtBranch = async (
  branch: BranchOrSHA,
  file: string
): Promise<string> => {
  try {
    return await gitImmutableExecute( [ 'cat-file', 'blob', `${branch}:${file}` ], '..' );
  }
  catch( e ) {

    // Different git versions word a missing ref differently: newer git says "invalid object name '<ref>'", older git
    // says "Not a valid object name <ref>:<file>".
    const message = ( e as IntentionalPerennialAny ).message;
    if ( ( message.includes( 'invalid object name' ) || message.includes( 'Not a valid object name' ) ) && message.includes( branch ) ) {

      await ensureLocalBranchFromRemote( branch );
      return gitCatFile( file, branch );
    }
    else {
      throw e;
    }
  }
};
