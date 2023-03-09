// Copyright 2023, University of Colorado Boulder

/**
 * Sets the supported brands of the current checked-in repo's package.json, creating a commit with the change
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const gitAdd = require( './gitAdd' );
const gitCommit = require( './gitCommit' );
const gitIsClean = require( './gitIsClean' );
const loadJSON = require( './loadJSON' );
const writeJSON = require( './writeJSON' );
const winston = require( 'winston' );

/**
 * Sets the supported brands of the current checked-in repo's package.json, creating a commit with the change
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string[]} brands
 * @param {string} [message] - Optional. If provided, appended at the end
 * @returns {Promise}
 */
module.exports = async function setRepoSupportedBrands( repo, brands, message ) {
  winston.info( `Setting supported brands from package.json for ${repo} to ${brands}` );

  const packageFile = `../${repo}/package.json`;

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot increment version` );
  }

  const packageObject = await loadJSON( packageFile );
  packageObject.phet = packageObject.phet || {};
  packageObject.phet.supportedBrands = brands;

  await writeJSON( packageFile, packageObject );
  await gitAdd( repo, 'package.json' );
  await gitCommit( repo, `Updating supported brands to [${brands}]${message ? `, ${message}` : ''}` );
};
