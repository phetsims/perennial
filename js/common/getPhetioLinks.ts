// Copyright 2019-2026, University of Colorado Boulder

/**
 * Print the list of production sims for clients.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Chris Klusendorf (PhET Interactive Simulations)
 */

import _ from 'lodash';
import simPhetioMetadata, { SimPhetioMetadata } from './simPhetioMetadata.js';
import { BranchVersion, Sim } from '../browser-and-node/PerennialTypes.js';
import { Checkout } from './Checkout.js';

const getPhetioLinks = async (): Promise<string[]> => {

  const allSimsData = await simPhetioMetadata( {
    active: true,
    latest: true
  } );

  // Get a list of sim versions where the highest versions of each sim are first.
  const sortedAndReversed = _.sortBy( allSimsData, simData => `${simData.name}${getVersion( simData )}` ).reverse();

  // Get rid of all lower versions, then reverse back to alphabetical sorting.
  const oneVersionPerSimList = _.uniqBy( sortedAndReversed, simData => simData.name ).reverse();

  const phetioLinks = [];
  for ( const simData of oneVersionPerSimList ) {

    const useTopLevelIndex = await usesTopLevelIndex( simData.name, getBranch( simData ) );

    phetioLinks.push( `https://phet-io.colorado.edu/sims/${simData.name}/${getVersion( simData )}/${useTopLevelIndex ? '' : 'wrappers/index/'}` );
  }

  return phetioLinks;
};

export default getPhetioLinks;

/**
 * Returns whether phet-io Studio is being used instead of deprecated instance proxies wrapper.
 */
async function usesTopLevelIndex( sim: Sim, branchVersion: BranchVersion ): Promise<boolean> {
  return ( await Checkout.getLightweightReleaseBranchCheckout( sim, branchVersion ) ).hasTopLevelStudioIndex();
}

// {Object} metadata -> version string
const getVersion = ( simData: SimPhetioMetadata ) => `${simData.versionMajor}.${simData.versionMinor}`;

// {Object} metadata -> branch name
const getBranch = ( simData: SimPhetioMetadata ) => {
  let branch = `${simData.versionMajor}.${simData.versionMinor}`;
  if ( simData.versionSuffix.length ) {
    branch += `-${simData.versionSuffix}`; // additional dash required
  }
  return branch;
};