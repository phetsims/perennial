// Copyright 2017, University of Colorado Boulder

/**
 * Builds a repository.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const ChipperVersion = require( '../common/ChipperVersion' );
const gruntCommand = require( '../common/gruntCommand' );
const execute = require( './execute' );
const assert = require( 'assert' );
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
  const {
    brands = [ 'phet' ],
    locales = 'en',
    allHTML = true,
    debugHTML = true, // Desired in almost all perennial builds, so set to true here
    uglify = true,
    mangle = true,
    lint = true,
    thumbnails = false,
    twitterCard = false
  } = options || {};

  winston.info( `building ${repo}` );

  const chipperVersion = ChipperVersion.getFromRepository();
  const args = [];

  // Chipper "1.0" (it was called such) had version 0.0.0 in its package.json
  if ( chipperVersion.major === 0 && chipperVersion.minor === 0 ) {
    assert( brands.length === 1, 'chipper 0.0.0 cannot build multiple brands at a time' );
    if ( lint ) {
      args.push( 'lint-all' );
    }
    args.push( 'clean' );
    args.push( 'build' );
    if ( thumbnails ) {
      args.push( 'generate-thumbnails' );
    }
    if ( twitterCard ) {
      args.push( 'generate-twitter-card' );
    }
    args.push( `--brand=${brands[ 0 ]}` );
    args.push( `--locales=${locales}` );
    if ( !uglify ) {
      args.push( '--uglify=false' );
    }
    if ( !mangle ) {
      args.push( '--mangle=false' );
    }
    if ( allHTML && brands[ 0 ] !== 'phet-io' ) {
      args.push( '--allHTML' );
    }
    if ( debugHTML ) {
      args.push( '--debugHTML' );
    }
  }
  // Chipper 2.0
  else if ( chipperVersion.major === 2 && chipperVersion.minor === 0 ) {
    args.push( `--brands=${brands.join( ',' )}` );
    args.push( `--locales=${locales}` );
    if ( !uglify ) {
      args.push( '--uglify=false' );
    }
    if ( !mangle ) {
      args.push( '--mangle=false' );
    }
    if ( !lint ) {
      args.push( '--lint=false' );
    }
    if ( allHTML ) {
      args.push( '--allHTML' );
    }
    if ( debugHTML ) {
      args.push( '--debugHTML' );
    }
  }
  else {
    throw new Error( `unsupported chipper version: ${chipperVersion.toString()}` );
  }

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
