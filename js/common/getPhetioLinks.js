// Copyright 2019-2023, University of Colorado Boulder

/**
 * Print the list of production sims for clients.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Chris Klusendorf (PhET Interactive Simulations)
 */

const _ = require( 'lodash' );
const getDependencies = require( './getDependencies' );
const gitCheckout = require( './gitCheckout' );
const gitIsAncestor = require( './gitIsAncestor' );
const simPhetioMetadata = require( './simPhetioMetadata' );

module.exports = async () => {

  // {Array.<Object>} get sim metadata via metadata API, here is an example of what an entry might look like:
  /*
  {
    "versionMaintenance": 12,
    "name": "molarity",
    "active": true,
    "versionMajor": 1,
    "versionMinor": 4,
    "versionSuffix": "",
    "latest": true,
    "timestamp": "2019-10-25"
  }
   */
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

/**
 * Returns whether phet-io Studio is being used instead of deprecated instance proxies wrapper.
 *
 * @param {string} repo
 * @param {string} branch
 * @returns {Promise.<boolean>}
 */
async function usesTopLevelIndex( repo, branch ) {
  await gitCheckout( repo, branch );
  const dependencies = await getDependencies( repo );
  const sha = dependencies.chipper.sha;
  await gitCheckout( repo, 'master' );

  return gitIsAncestor( 'chipper', '8db0653ee0cbb6ed716fa3b4d4759bcb75d8118a', sha );
}

// {Object} metadata -> version string
const getVersion = simData => `${simData.versionMajor}.${simData.versionMinor}`;

// {Object} metadata -> branch name
const getBranch = simData => {
  let branch = `${simData.versionMajor}.${simData.versionMinor}`;
  if ( simData.versionSuffix.length ) {
    branch += `-${simData.versionSuffix}`; // additional dash required
  }
  return branch;
};