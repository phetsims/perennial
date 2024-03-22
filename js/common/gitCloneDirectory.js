// Copyright 2017, University of Colorado Boulder

/**
 * git clones one of our repositories
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const winston = require( 'winston' );
const execute = require( './execute' );

/**
 * @public
 *
 * @param {string} repo
 * @param {string} directory
 * @returns {Promise}
 */
module.exports = async function( repo, directory ) {
  winston.info( `cloning repo ${repo} in ${directory}` );
  if ( repo === 'perennial-alias' ) {
    await execute( 'git', [ 'clone', 'https://github.com/phetsims/perennial.git', repo ], directory );
  }
  else {
    await execute( 'git', [ 'clone', `https://github.com/phetsims/${repo}.git` ], directory );
  }
};