// Copyright 2023, University of Colorado Boulder

/**
 * Does some branch changes so that a releaseBranch's dependency SHA matches a named branch
 *
 * For example, gravity-and-orbits 1.6 has a dependencies.json that says joist is at X. If there is a joist branch
 * named 'gravity-and-orbits-1.6', it SHOULD point at X. If it doesn't, we'll change it to point at X. If we change it,
 * we also want to not have the old SHAs garbage collected, so we create 'gravity-and-orbits-1.6-old' to point to it.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute' );
const getBranchDependencies = require( './getBranchDependencies' );
const getBranches = require( './getBranches' );
const gitCheckout = require( './gitCheckout' );
const gitCreateBranch = require( './gitCreateBranch' );
const gitPush = require( './gitPush' );
const gitRevParse = require( './gitRevParse' );
const winston = require( 'winston' );

/**
 * Does some branch changes so that a releaseBranch's dependency SHA matches a named branch
 * @public
 *
 * @param {string} repo - The simulation's repository
 * @param {string} branch - The branch name
 * @param {string} commonRepo
 * @returns {Promise}
 */
module.exports = async function( repo, branch, commonRepo ) {

  const commonBranch = `${repo}-${branch}`;
  const commonOldBranch = `${commonBranch}-old`;

  const commonRepoBranches = await getBranches( commonRepo );

  if ( !commonRepoBranches.includes( commonBranch ) ) {
    throw new Error( `Branch ${commonBranch} does not exist in ${commonRepo}` );
  }
  if ( commonRepoBranches.includes( commonOldBranch ) ) {
    throw new Error( `Branch ${commonOldBranch} already exists in ${commonRepo}. This happened twice, please manually fix` );
  }

  const dependencies = await getBranchDependencies( repo, branch );
  const sha = dependencies[ commonRepo ].sha;
  if ( !sha ) {
    throw new Error( 'We do not have a working SHA' );
  }

  // Set up 'old' branch, in order to save history
  await gitCheckout( commonRepo, commonBranch );
  winston.info( `Creating ${commonOldBranch} in ${commonRepo} with ${await gitRevParse( commonRepo, 'HEAD' )}` );
  await gitCreateBranch( commonRepo, commonOldBranch );
  await gitPush( commonRepo, commonOldBranch );

  // Fix the branch with the proper name
  await gitCheckout( commonRepo, commonBranch );
  winston.info( `Moving ${commonBranch} in ${commonRepo} to ${sha}` );
  await execute( 'git', [ 'reset', '--hard', sha ], `../${commonRepo}` );
  await execute( 'git', [ 'push', '-f', '-u', 'origin', commonBranch ], `../${commonRepo}` );
};
