// Copyright 2026, University of Colorado Boulder

/**
 * Gets the given file from a totality branch
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute.js';
import { IntentionalPerennialAny } from '../browser-and-node/PerennialTypes.js';
import { createTotalityLocalBranchFromRemote } from './createTotalityLocalBranchFromRemote.js';

export const getTotalityFileAtBranch = async ( branch: string, file: string ): Promise<string> => {
  try {
    return execute( 'git', [ 'cat-file', 'blob', `${branch}:${file}` ], '..' );
  }
  catch( e ) {
    if ( ( e as IntentionalPerennialAny ).message.includes( 'invalid object name' ) && ( e as IntentionalPerennialAny ).message.includes( branch ) ) {

      await createTotalityLocalBranchFromRemote( branch );
      return getTotalityFileAtBranch( branch, file );
    }
    else {
      throw e;
    }
  }
};
