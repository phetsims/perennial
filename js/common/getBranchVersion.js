// Copyright 2023, University of Colorado Boulder

/**
 * Returns the version of the repo's package.json on a given branch
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const SimVersion = require( './SimVersion' );
const getFileAtBranch = require( './getFileAtBranch' );
const winston = require( 'winston' );

/**
 * Returns the version of the repo's package.json on a given branch
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} branch - The branch name
 * @returns {Promise.<SimVersion>}
 */
module.exports = async function( repo, branch ) {
  winston.debug( `Reading version from package.json for ${repo}` );

  return SimVersion.parse( JSON.parse( await getFileAtBranch( repo, branch, 'package.json' ) ).version );
};
