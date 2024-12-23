// Copyright 2019-2023, University of Colorado Boulder

/**
 * Print the list of production sims for clients.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Chris Klusendorf (PhET Interactive Simulations)
 */

const _ = require( 'lodash' );
const gitIsAncestor = require( './gitIsAncestor' );
const getFileAtBranch = require( './getFileAtBranch' );
const simPhetioMetadata = require( './simPhetioMetadata' ).default;

module.exports = async () => {

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
  const dependencies = JSON.parse( await getFileAtBranch( repo, branch, 'dependencies.json' ) );
  const sha = dependencies.chipper.sha;

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