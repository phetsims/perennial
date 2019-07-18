// Copyright 2019, University of Colorado Boulder

/**
 * Print the list of production sims for clients.
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

module.exports = async () => {

  // get sim metadata via metadata api
  const allSimsData = await simPhetioMetadata( {
    active: true,
    latest: true
  } );

  const filtered = allSimsData.filter(
    simData => simData.active && simData.latest );

  // store only the latest version per sim in this map
  const oneVersionPerSimMap = {};

  // go through all versions and assign it to the map if it is a "later version" that that which is currently stored.
  for ( const simData of filtered ) {
    const simName = simData.name;
    oneVersionPerSimMap[ simName ] = oneVersionPerSimMap[ simName ] || simData;
    if ( compareVersionNumber( oneVersionPerSimMap[ simName ], simData ) < 0 ) {
      oneVersionPerSimMap[ simName ] = simData;
    }
  }

  // convert the map into an array of the sim versions
  const oneVersionPerSimList = Object.keys( oneVersionPerSimMap ).sort().map( name => oneVersionPerSimMap[ name ] );

  const phetioLinks = [];
  for ( const simData of oneVersionPerSimList ) {

    const useTopLevelIndex = await usesTopLevelIndex( simData.name, getBranch( simData ) );

    phetioLinks.push( `https://phet-io.colorado.edu/sims/${simData.name}/${getVersion( simData )}/${useTopLevelIndex ? '' : 'wrappers/index/'}` );
  }

  console.log( 'Latest Links:' );
  console.log( `\n${phetioLinks.join( '\n' )}` );
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

  return await gitIsAncestor( 'chipper', '8db0653ee0cbb6ed716fa3b4d4759bcb75d8118a', sha );
}

// {Object} metadata -> version string
const getVersion = simData => `${simData.versionMajor}.${simData.versionMinor}`;

// {Object} metadata -> branch name
const getBranch = ( simData ) => {
  let branch = `${simData.versionMajor}.${simData.versionMinor}`;
  if ( simData.versionSuffix.length ) {
    branch += '-' + simData.versionSuffix; // additional dash required
  }
  return branch;
};

/**
 * See SimVersion.compareNumber()
 * @param {string} version1
 * @param {string} version2
 * @returns {number}
 */
const compareVersionNumber = ( version1, version2 ) => {
  if ( version1.versionMajor < version2.versionMajor ) { return -1; }
  if ( version1.versionMajor > version2.versionMajor ) { return 1; }
  if ( version1.versionMinor < version2.versionMinor ) { return -1; }
  if ( version1.versionMinor > version2.versionMinor ) { return 1; }
  if ( version1.versionMaintenance < version2.versionMaintenance ) { return -1; }
  if ( version1.versionMaintenance > version2.versionMaintenance ) { return 1; }
  return 0; // equal
};