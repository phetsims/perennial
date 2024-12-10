// Copyright 2020, University of Colorado Boulder

/**
 * Clones missing repositories
 * Expects to be run with CWD in the top level of a repo.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const cloneRepo = require( './cloneRepo' );
const getMissingRepos = require( './getMissingRepos' );
const winston = require( 'winston' );
const execute = require( './execute' ).default;

/**
 * Clones missing repositories
 * @public
 * @param [omitPrivate]
 * @returns {Promise.<string>} - The names of the repos cloned
 */
module.exports = async omitPrivate => {
  winston.info( 'Cloning missing repos' );

  const missingRepos = getMissingRepos( omitPrivate );

  for ( const repo of missingRepos ) {
    try {
      await cloneRepo( repo );
    }
    catch( e ) {
      winston.info( `Could not clone ${repo}, did you mean to omit private repos with  -p?` );
      throw e;
    }
    await execute( 'git', [ 'init', '--template=../phet-info/git-template-dir' ], '../' );
  }

  return missingRepos;
};