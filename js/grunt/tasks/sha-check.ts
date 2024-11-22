// Copyright 2024, University of Colorado Boulder

/**
 * Checks which simulations' latest release version includes the given common-code SHA in its git tree, by checking
 * whether tehy include the SHA in their release branch.
 * --repo : repository to check for the SHA
 * --sha : git SHA
 *
 * TODO: ASK DEVS: Delete this grunt task, SR MK think it doesn't belong in formal API, https://github.com/phetsims/chipper/issues/1461
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import getOption from './util/getOption.js';

const getDependencies = require( '../../common/getDependencies.js' );
const gitCheckout = require( '../../common/gitCheckout.js' );
const gitIsAncestor = require( '../../common/gitIsAncestor.js' );
const simMetadata = require( '../../common/simMetadata.js' );

/**
 * Will print out information about with simulations include the given SHA, and which ones don't.
 */
async function shaCheck( repo: string, sha: string ): Promise<void> {
  const data = await simMetadata();

  const sims = data.projects.map( ( simData: any ) => {
    return {
      name: simData.name.slice( simData.name.indexOf( '/' ) + 1 ),
      branch: `${simData.version.major}.${simData.version.minor}`
    };
  } );

  const includedSims: Array<{ name: string; branch: string }> = [];
  const excludedSims: Array<{ name: string; branch: string }> = [];

  for ( const sim of sims ) {
    console.log( `checking ${sim.name}` );

    await gitCheckout( sim.name, sim.branch );
    const dependencies = await getDependencies( sim.name );
    const repoSHA = dependencies[ repo ].sha;
    const isAncestor = await gitIsAncestor( repo, sha, repoSHA );
    ( isAncestor ? includedSims : excludedSims ).push( sim );
    await gitCheckout( sim.name, 'main' );
  }

  console.log( '\nSims that include the commit in their tree: ' );
  console.log( includedSims.map( sim => sim.name ).join( '\n' ) );
  console.log( '\nSims that do NOT include the commit in their tree: ' );
  console.log( excludedSims.map( sim => sim.name ).join( '\n' ) );
}

( async () => {
  const repo = getOption( 'repo' );
  assertIsValidRepoName( repo );

  await shaCheck( repo, getOption( 'sha' ) );
} )();