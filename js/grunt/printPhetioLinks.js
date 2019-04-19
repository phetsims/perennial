// Copyright 2019, University of Colorado Boulder

/**
 * Print the list of production sims for clients.
 *
 * TODO: Note! There could be duplicates for one sim based on different minor versions.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Chris Klusendorf (PhET Interactive Simulations)
 */

'use strict';

// modules
const gitCheckout = require( '../common/gitCheckout' );
const getDependencies = require( '../common/getDependencies' );
const gitIsAncestor = require( '../common/gitIsAncestor' );
const simPhetioMetadata = require( '../common/simPhetioMetadata' );

/**
 * Returns whether phet-io Studio is being used instead of deprecated instance proxies wrapper.
 *
 * @returns {Promise.<boolean>}
 */
async function usesTopLevelIndex( repo, branch ) {
  await gitCheckout( repo, branch );
  const dependencies = await getDependencies( repo );
  const sha = dependencies.chipper.sha;
  await gitCheckout( repo, 'master' );

  return await gitIsAncestor( 'chipper', '8db0653ee0cbb6ed716fa3b4d4759bcb75d8118a', sha );
}

/**
 * Checks out a SHA/branch for a repository, and also checks out all of its dependencies.
 * @public
 *
 */
module.exports = async () => {

  // metadata -> version string
  const getVersion = ( simData ) => {
    let string = `${simData.versionMajor}.${simData.versionMinor}.${simData.versionMaintenance}`;
    if ( simData.versionSuffix ) {
      string += `-${simData.versionSuffix}`;
    }
    return string;
  };

  // metadata -> branch name
  const getBranch = ( simData ) => {
    let branch = `${simData.versionMajor}.${simData.versionMinor}`;
    if ( simData.versionSuffix.length ) {
      branch += '-' + simData.versionSuffix; // additional dash required
    }
    return branch;
  };

  // get sim metadata via metadata api
  const allSimsData = await simPhetioMetadata( {
    active: true,
    latest: true
  } );

  const sortedAndFiltered = allSimsData.sort( ( simData1, simData2 ) => simData1.name.localeCompare( simData2.name ) ).filter(
    simData => simData.active && simData.latest );

  const phetioBranches = [];
  for ( const simData of sortedAndFiltered ) {
    console.log( 'hello ', simData.name );

    const useTopLevelIndex = await usesTopLevelIndex( simData.name, getBranch( simData ) );

    phetioBranches.push( `https://phet-io.colorado.edu/sims/${simData.name}/${getVersion( simData )}${useTopLevelIndex ? '' : '/wrappers/index'}` );
  }

  console.log( `\n${phetioBranches.join( '\n' )}` );
};
