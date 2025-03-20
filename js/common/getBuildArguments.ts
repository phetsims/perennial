// Copyright 2022, University of Colorado Boulder

/**
 * Returns a list of arguments to use with `grunt` to build a specific simulation
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import type ChipperVersion from './ChipperVersion.js';

export type BuildOptions = {
  brands: string[];
  locales: string;
  allHTML: boolean;
  debugHTML: boolean;
  uglify: boolean;
  mangle: boolean;
  minify: boolean;
  lint: boolean;
  typeCheck: boolean;
  clean: boolean;
  thumbnails: boolean;
  twitterCard: boolean;
  buildForServer: boolean;
};

/**
 * Returns a list of arguments to use with `grunt` to build a specific simulation
 */
function getBuildArguments( chipperVersion: ChipperVersion, options: Partial<BuildOptions> ): string[] {
  const {
    brands = [ 'phet' ],
    locales = 'en',
    allHTML = true,
    debugHTML = true, // Desired in almost all perennial builds, so set to true here
    uglify = true,
    mangle = true,
    minify = true,
    lint = true,
    typeCheck = true,
    clean = true,
    thumbnails = false,
    twitterCard = false,
    buildForServer = false
  } = options || {};

  const args = [];

  // Chipper "1.0" (it was called such) had version 0.0.0 in its package.json
  if ( chipperVersion.major === 0 && chipperVersion.minor === 0 ) {
    assert( brands.length === 1, 'chipper 0.0.0 cannot build multiple brands at a time' );
    if ( lint ) {
      args.push( 'lint-all' ); // Should be "lint-all", not "lint-project", for backwards compatibility
    }
    if ( clean ) {
      args.push( 'clean' );
    }
    if ( buildForServer ) {
      // This is a vital flag for chipper 1.0. Do not remove until this is no longer supported.
      args.push( 'build-for-server' );
    }
    else {
      args.push( 'build' );
    }
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
      args.push( '--minify.uglify=false' );
    }
    if ( !mangle ) {
      args.push( '--minify.mangle=false' );
    }
    if ( !minify ) {
      args.push( '--minify.minify=false' );
    }
    if ( !lint ) {
      args.push( '--lint=false' );
    }
    if ( !typeCheck ) {
      args.push( '--type-check=false' );
    }
    if ( allHTML ) {
      args.push( '--allHTML' ); // This option doesn't exist on main as of 8/22/24, but this is kept for backwards compatibility
    }
    if ( debugHTML ) {
      args.push( '--debugHTML' );
    }
  }
  else {
    throw new Error( `unsupported chipper version: ${chipperVersion.toString()}` );
  }

  return args;
}

export default getBuildArguments;