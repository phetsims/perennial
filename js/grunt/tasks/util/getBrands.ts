// Copyright 2013-2024, University of Colorado Boulder

/**
 * @author Sam Reid (PhET Interactive Simulations)
 */
import assert from 'assert';
import getOption from './getOption.js';
import buildLocal from '../../../common/buildLocal.js';

const getBrands = ( grunt: any, repo: string ) => {

  // Determine what brands we want to build
  assert( !getOption( 'brand' ), 'Use --brands={{BRANDS}} instead of brand' );

  const localPackageObject = grunt.file.readJSON( `../${repo}/package.json` );
  const supportedBrands = localPackageObject.phet.supportedBrands || [];

  let brands: string[];
  if ( getOption( 'brands' ) ) {
    if ( getOption( 'brands' ) === '*' ) {
      brands = supportedBrands;
    }
    else {
      brands = getOption( 'brands' ).split( ',' );
    }
  }
  else if ( buildLocal.brands ) {
    // Extra check, see https://github.com/phetsims/chipper/issues/640
    assert( Array.isArray( buildLocal.brands ), 'If brands exists in build-local.json, it should be an array' );
    brands = buildLocal.brands.filter( ( brand: string ) => supportedBrands.includes( brand ) );
  }
  else {
    brands = [ 'adapted-from-phet' ];
  }

  // Ensure all listed brands are valid
  brands.forEach( brand => assert( supportedBrands.includes( brand ), `Unsupported brand: ${brand}` ) );

  return brands;
};

module.exports = getBrands;