// Copyright 2017, University of Colorado Boulder

/**
 * Builds a repository.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const assert = require( 'assert' );
const execute = require( '../common/execute' );
const fs = require( 'fs' );
const gruntCommand = require( '../common/gruntCommand' );
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

  const chipperVersion = JSON.parse( fs.readFileSync( '../chipper/package.json', 'utf8' ) ).version;
  const args = [];

  // Currently has the same flag versions
  if ( chipperVersion === '0.0.0' ) {
    assert( brands.length === 1, 'Chiper 0.0.0 cannot build multiple brands at a time' );
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
    args.push( `--brand=${brands[ 0 ]}}` );
    args.push( `--locales=${locales}` );
    if ( !uglify ) {
      args.push( '--uglify=false' );
    }
    if ( !mangle ) {
      args.push( '--mangle=false' );
    }
    if ( allHTML ) {
      args.push( '--allHTML' );
    }
    if ( debugHTML ) {
      args.push( '--debugHTML' );
    }
  }
  else if ( chipperVersion === '2.0.0' ) {
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
    throw new Error( `unsupported chipper version: ${chipperVersion}` );
  }

  const result = await execute( gruntCommand, args, `../${repo}` );

  // Examine output to see if getDependencies (in chipper) notices any missing phet-io things. Fail out if so. Detects that specific error message.
  if ( result.includes( 'WARNING404' ) ) {
    throw new Error( 'phet-io dependencies missing' );
  }

  return result;
};
