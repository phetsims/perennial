// Copyright 2017-2026, University of Colorado Boulder

/**
 * git clones one of our repositories
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { getActiveSceneryStackRepos } from './getActiveSceneryStackRepos.js';
import { gitImmutableExecute } from './gitMutex.js';
import { Repo } from '../browser-and-node/PerennialTypes.js';

export const gitCloneDirectory = async ( repo: Repo, directory: string ): Promise<void> => {
  winston.info( `cloning repo ${repo} in ${directory}` );
  if ( getActiveSceneryStackRepos().includes( repo ) ) {
    await gitImmutableExecute( [ 'clone', `https://github.com/scenerystack/${repo}.git` ], directory );
  }
  else if ( repo === 'perennial-alias' ) {
    await gitImmutableExecute( [ 'clone', 'https://github.com/phetsims/perennial.git', repo ], directory );
  }
  else {
    await gitImmutableExecute( [ 'clone', `https://github.com/phetsims/${repo}.git` ], directory );
  }
};
