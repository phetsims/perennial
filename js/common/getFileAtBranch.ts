// Copyright 2026, University of Colorado Boulder

/**
 * Gets the given file from a totality branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { IntentionalPerennialAny } from '../browser-and-node/PerennialTypes.js';
import { ensureLocalBranchFromRemote } from './ensureLocalBranchFromRemote.js';
import { gitCatFile } from './gitCatFile.js';
import { gitImmutableExecute } from './gitMutex.js';

export const getFileAtBranch = async (
  branch: string,
  file: string
): Promise<string> => {
  try {
    return gitImmutableExecute( [ 'cat-file', 'blob', `${branch}:${file}` ], '..' );
  }
  catch( e ) {
    if ( ( e as IntentionalPerennialAny ).message.includes( 'invalid object name' ) && ( e as IntentionalPerennialAny ).message.includes( branch ) ) {

      await ensureLocalBranchFromRemote( branch );
      return gitCatFile( branch, file );
    }
    else {
      throw e;
    }
  }
};
