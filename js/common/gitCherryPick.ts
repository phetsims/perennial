// Copyright 2017-2026, University of Colorado Boulder

/**
 * git cherry-pick (but if it fails, it will back out of the cherry-pick)
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitMutableExecute } from './gitMutex.js';

/**
 * Executes git cherry-pick (but if it fails, it will back out of the cherry-pick)
 * @public
 *
 * @param target - The SHA/branch/whatnot to check out
 * @returns - Resolves to whether the cherry-pick worked or not. If aborting fails, will reject.
 */
export const gitCherryPick = async ( target: string ): Promise<boolean> => {
  winston.info( `git cherry-pick ${target} ` );

  return gitMutableExecute( [ 'cherry-pick', target ], '..' ).then( stdout => Promise.resolve( true ), cherryPickError => {
    winston.info( `git cherry-pick failed (aborting): ${target}` );

    return gitMutableExecute( [ 'cherry-pick', '--abort' ], '..' ).then( stdout => Promise.resolve( false ), abortError => {
      winston.error( `git cherry-pick --abort failed: ${target}` );
      return Promise.reject( abortError );
    } );
  } );
};
