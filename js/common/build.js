// Copyright 2017, University of Colorado Boulder

/**
 * Builds a repository.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
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
 */
module.exports = async function( repo, options ) {
  const {
    brand = 'phet',
    locales = 'en',
    allHTML = false,
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
  if ( chipperVersion === '0.0.0' || chipperVersion === '2.0.0' ) {
    args.push( 'lint-all' );
    args.push( 'clean' );
    args.push( 'build' );
    if ( thumbnails ) {
      args.push( 'generate-thumbnails' );
    }
    if ( twitterCard ) {
      args.push( 'generate-twitter-card' );
    }
    args.push( `--brand=${brand}` );
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
  }
  else {
    throw new Error( `unsupported chipper version: ${chipperVersion}` );
  }

  return execute( gruntCommand, args, `../${repo}` );
};
