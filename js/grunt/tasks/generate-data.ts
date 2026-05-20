// Copyright 2024-2026, University of Colorado Boulder

/**
 * Generates the lists under perennial/data/, and if there were changes, will commit and push.
 *
 * This grunt task should be run manually by developers when a change has been made that would add or remove
 * an entry from one of the perennial/data/ lists. But it will also be run as part of daily-grunt-work.sh
 * to catch anything that was forgotten.
 *
 * This used to be run automatically by bayes whenever a relevant change was made, see
 * https://github.com/phetsims/perennial/issues/66
 *
 * But we decided to change it to a manual step with a daily fallback, see
 * https://github.com/phetsims/perennial/issues/213
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import winston from 'winston';
import { IntentionalPerennialAny } from '../../browser-and-node/PerennialTypes.js';
import { getActiveRepos } from '../../common/repos/getActiveRepos.js';
import fs from 'fs';
import os from 'os';

/**
 * Generates the lists under perennial/data/, and if there were changes, will commit and push.
 */
async function generateData(): Promise<void> {

  const activeRepos: string[] = getActiveRepos();

  function writeList( name: string, packageFilter: ( repo: IntentionalPerennialAny ) => void ): void {
    const repos = activeRepos.filter( repo => {
      // In the monorepo, not all active repos are imported, so skip missing ones.
      if ( !fs.existsSync( `../${repo}` ) ) {
        return false;
      }

      let packageObject;
      try {
        packageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) );
      }
      catch( e ) {
        return false;
      }
      return packageObject.phet && packageFilter( packageObject.phet );
    } );

    winston.info( `Writing to data/${name}` );
    fs.writeFileSync( `data/${name}`, repos.join( os.EOL ) + os.EOL );
  }

  writeList( 'interactive-description', phet => phet.simFeatures && phet.simFeatures.supportsInteractiveDescription );
  writeList( 'voicing', phet => phet.simFeatures && phet.simFeatures.supportsVoicing );
  writeList( 'active-runnables', phet => phet.runnable );
  writeList( 'active-sims', phet => phet.simulation );
  writeList( 'unit-tests', phet => phet.generatedUnitTests );
  writeList( 'phet-io', phet => phet.runnable && phet.supportedBrands && phet.supportedBrands.includes( 'phet-io' ) );
  writeList( 'phet-io-api-stable', phet => {
    return phet.runnable && phet.supportedBrands && phet.supportedBrands.includes( 'phet-io' ) &&
           phet[ 'phet-io' ] && phet[ 'phet-io' ].compareDesignedAPIChanges;
  } );

  // In the monorepo, the shell script handles git add/commit/push for data file changes, in daily-grunt-work
}

( async () => generateData() )();