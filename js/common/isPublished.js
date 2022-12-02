// Copyright 2022, University of Colorado Boulder

/**
 * Returns whether a repo is published (not a prototype)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const gitCheckout = require( './gitCheckout' );
const fs = require( 'fs' );

/**
 * Returns whether a repo is published (not a prototype)
 * @public
 *
 * NOTE: Needs to be on master branch
 *
 * @param {string} repo
 *
 * @returns {Promise<boolean>}
 */
module.exports = async function( repo ) {
  await gitCheckout( repo, 'master' );
  const packageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) );

  return !!packageObject?.phet?.published;
};
