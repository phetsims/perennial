// Copyright 2017-2026, University of Colorado Boulder

/**
 * git clones one of our repositories
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

const winston = require( 'winston' );
const execute = require( './execute' ).default;
const getActiveSceneryStackRepos = require( './getActiveSceneryStackRepos' );
const { gitImmutableExecute } = require( './gitMutex' );

/**
 * @public
 *
 * @param {string} repo
 * @param {string} directory
 * @returns {Promise}
 */
module.exports = async function gitCloneDirectory( repo, directory ) {
  winston.info( `cloning repo ${repo} in ${directory}` );
  if ( getActiveSceneryStackRepos().includes( repo ) ) {
    await gitImmutableExecute( [ 'clone', `https://github.com/scenerystack/${repo}.git` ], directory );
  }
  else if ( repo === 'perennial-alias' ) {
    await gitImmutableExecute( [ 'clone', 'https://github.com/phetsims/perennial.git', repo ], directory );
  }
  else {
    await gitImmutableExecute( [ 'clone', `https://github.com/phetsims/${repo}.git` ], directory );
  }
};