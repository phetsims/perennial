// Copyright 2024, University of Colorado Boulder

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
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { IntentionalPerennialAny } from '../../browser-and-node/PerennialTypes.js';

const getActiveRepos = require( '../../common/getActiveRepos.js' );
const getBranch = require( '../../common/getBranch.js' );
const gitAdd = require( '../../common/gitAdd.js' );
const gitCommit = require( '../../common/gitCommit.js' );
const gitIsClean = require( '../../common/gitIsClean.js' );
const gitPush = require( '../../common/gitPush.js' );
const assert = require( 'assert' );
const fs = require( 'fs' );
const grunt = require( 'grunt' );
const os = require( 'os' );
const winston = require( 'winston' );

/**
 * Generates the lists under perennial/data/, and if there were changes, will commit and push.
 */
async function generateData(): Promise<void> {
  if ( await getBranch( 'perennial' ) !== 'main' || !await gitIsClean( 'perennial' ) ) {
    throw new Error( 'Data will only be generated if perennial is on main with no working-copy changes.' );
  }

  const activeRepos: string[] = getActiveRepos();

  function writeList( name: string, packageFilter: ( repo: IntentionalPerennialAny ) => void ): void {
    const repos = activeRepos.filter( repo => {
      // Make sure that if someone doesn't have all repositories checked out that this will FAIL. Otherwise bad things.
      assert( grunt.file.exists( `../${repo}` ) );

      let packageObject;
      try {
        packageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) );
      }
      catch( e ) {
        return false;
      }
      return packageObject.phet && packageFilter( packageObject.phet );
    } );

    grunt.log.writeln( `Writing to data/${name}` );
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

  await gitAdd( 'perennial', 'data/interactive-description' );
  await gitAdd( 'perennial', 'data/voicing' );
  await gitAdd( 'perennial', 'data/active-runnables' );
  await gitAdd( 'perennial', 'data/active-sims' );
  await gitAdd( 'perennial', 'data/unit-tests' );
  await gitAdd( 'perennial', 'data/phet-io' );
  await gitAdd( 'perennial', 'data/phet-io-api-stable' );

  const hasChanges = !await gitIsClean( 'perennial' );
  if ( hasChanges ) {
    winston.info( 'Changes to data files detected, will push' );
    await gitCommit( 'perennial', 'Automated update of perennial data files' );
    await gitPush( 'perennial', 'main' );
  }
  else {
    winston.info( 'No changes detected' );
  }
}

( async () => generateData() )();