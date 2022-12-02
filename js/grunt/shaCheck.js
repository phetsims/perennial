// Copyright 2017, University of Colorado Boulder

/**
 * Given a repository and a SHA, it checks all live HTML sims to see whether they include the SHA in their release
 * branch or not.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getDependencies = require( '../common/getDependencies' );
const gitCheckout = require( '../common/gitCheckout' );
const gitIsAncestor = require( '../common/gitIsAncestor' );
const simMetadata = require( '../common/simMetadata' );

/**
 * Will print out information about with simulations include the given SHA, and which ones don't.
 * @public
 *
 * @param {string} repo
 * @param {string} sha
 * @returns {Promise}
 */
module.exports = async function( repo, sha ) {
  const data = await simMetadata();

  const sims = data.projects.map( simData => {
    return {
      name: simData.name.slice( simData.name.indexOf( '/' ) + 1 ),
      branch: `${simData.version.major}.${simData.version.minor}`
    };
  } );

  const includedSims = [];
  const excludedSims = [];

  for ( const sim of sims ) {
    console.log( `checking ${sim.name}` );

    await gitCheckout( sim.name, sim.branch );
    const dependencies = await getDependencies( sim.name );
    const repoSHA = dependencies[ repo ].sha;
    const isAncestor = await gitIsAncestor( repo, sha, repoSHA );
    ( isAncestor ? includedSims : excludedSims ).push( sim );
    await gitCheckout( sim.name, 'master' );
  }

  console.log( '\nSims that include the commit in their tree: ' );
  console.log( includedSims.map( sim => sim.name ).join( '\n' ) );
  console.log( '\nSims that do NOT include the commit in their tree: ' );
  console.log( excludedSims.map( sim => sim.name ).join( '\n' ) );
};
