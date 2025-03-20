// Copyright 2013-2024, University of Colorado Boulder

/**
 * @author Sam Reid (PhET Interactive Simulations)
 */
import assert from 'assert';
import fs from 'fs';
import buildLocal from '../../../common/buildLocal.js';
import getOption from './getOption.js';

type Brand = string;

const getBrands = ( repo: string ): Brand[] => {

  // Determine what brands we want to build
  assert( !getOption( 'brand' ), 'Use --brands={{BRANDS}} instead of brand' );

  const localPackageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf-8' ) );
  const supportedBrands = localPackageObject.phet?.supportedBrands || [];

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

  if ( !localPackageObject.phet?.buildStandalone ) {

    // Ensure all listed brands are valid
    brands.forEach( brand => assert( supportedBrands.includes( brand ), `Unsupported brand: ${brand}` ) );
    assert( brands.length > 0, `must have one or more brands, but found none for ${repo}` );
  }

  return brands;
};

export default getBrands;