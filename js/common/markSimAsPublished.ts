// Copyright 2022-2026, University of Colorado Boulder

/**
 * Ensures that a simulation is marked as published in its package.json
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import fs from 'fs';
import { gitAdd } from './git/gitAdd.js';
import { gitCommit } from './git/gitCommit.js';
import { gitPush } from './git/gitPush.js';
import { Sim } from '../browser-and-node/PerennialTypes.js';

export const markSimAsPublished = async ( sim: Sim ): Promise<void> => {
  const packageObject = JSON.parse( fs.readFileSync( `../${sim}/package.json`, 'utf8' ) );

  if ( !packageObject.phet.published ) {
    packageObject.phet.published = true;
    fs.writeFileSync( `../${sim}/package.json`, JSON.stringify( packageObject, null, 2 ) );

    await gitAdd( `${sim}/package.json` );
    await gitCommit( 'Marking simulation as published' );
    await gitPush( 'main' );
  }
};