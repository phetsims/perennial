// Copyright 2022-2026, University of Colorado Boulder

/**
 * Ensures that a simulation is marked as published in its package.json
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import fs from 'fs';
import { gitAdd } from './gitAdd.js';
import { gitCommit } from './gitCommit.js';
import { gitPush } from './gitPush.js';
import { Repo } from '../browser-and-node/PerennialTypes.js';

export const markRunnableAsPublished = async ( runnable: Repo ): Promise<void> => {
  const packageObject = JSON.parse( fs.readFileSync( `../${runnable}/package.json`, 'utf8' ) );

  if ( !packageObject.phet.published ) {
    packageObject.phet.published = true;
    fs.writeFileSync( `../${runnable}/package.json`, JSON.stringify( packageObject, null, 2 ) );

    await gitAdd( `${runnable}/package.json` );
    await gitCommit( 'Marking repository as published' );
    await gitPush( 'main' );
  }
};