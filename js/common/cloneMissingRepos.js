// Copyright 2020, University of Colorado Boulder

/**
 * Clones missing repositories
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const cloneRepo = require( './cloneRepo.js' );
const getMissingRepos = require( './getMissingRepos.js' );
const winston = require( 'winston' );

/**
 * Clones missing repositories
 * @public
 *
 * @returns {Promise.<string>} - The names of the repos cloned
 */
module.exports = async () => {
  winston.info( 'Cloning missing repos' );

  const missingRepos = getMissingRepos();

  for ( const repo of missingRepos ) {
    await cloneRepo( repo );
  }

  return missingRepos;
};