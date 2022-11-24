// Copyright 2017, University of Colorado Boulder

/**
 * Builds a repository.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const ChipperVersion = require( './ChipperVersion' );
const execute = require( './execute' );
const getBuildArguments = require( './getBuildArguments' );
const gruntCommand = require( './gruntCommand' );
const fs = require( 'fs' );
const winston = require( 'winston' );

/**
 * Builds a repository.
 * @public
 *
 * @param {string} repo
 * @param {Object} [options]
 * @returns {Promise.<string>} - The stdout of the build
 */
module.exports = async function( repo, options ) {
  winston.info( `building ${repo}` );

  const chipperVersion = ChipperVersion.getFromRepository();
  const args = getBuildArguments( chipperVersion, options );

  const result = await execute( gruntCommand, args, `../${repo}` );

  const packageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) );
  const includesPhetio = packageObject.phet && packageObject.phet.supportedBrands && packageObject.phet.supportedBrands.includes( 'phet-io' );

  // Examine output to see if getDependencies (in chipper) notices any missing phet-io things.
  // Fail out if so. Detects that specific error message.
  if ( includesPhetio && result.includes( 'WARNING404' ) ) {
    throw new Error( 'phet-io dependencies missing' );
  }

  return result;
};
