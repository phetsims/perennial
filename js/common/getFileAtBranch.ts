// Copyright 2026, University of Colorado Boulder

/**
 * Gets the given file from a totality branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import { IntentionalPerennialAny } from '../browser-and-node/PerennialTypes.js';
import { createLocalBranchFromRemote } from './createLocalBranchFromRemote.js';
import { gitCatFile } from './gitCatFile.js';

export const getFileAtBranch = async (
  branch: string,
  file: string
): Promise<string> => {
  try {
    return execute( 'git', [ 'cat-file', 'blob', `${branch}:${file}` ], '..' );
  }
  catch( e ) {
    if ( ( e as IntentionalPerennialAny ).message.includes( 'invalid object name' ) && ( e as IntentionalPerennialAny ).message.includes( branch ) ) {

      await createLocalBranchFromRemote( branch );
      return gitCatFile( branch, file );
    }
    else {
      throw e;
    }
  }
};
