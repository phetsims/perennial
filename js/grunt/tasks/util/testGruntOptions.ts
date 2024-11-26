// Copyright 2024, University of Colorado Boulder

import getOption from './getOption.js';

/**
 * Test that grunt parses options as expected.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default function testGruntOptions(): void {

// grunt test-grunt --brands=a,b,c --lint=false --tsc=false
  const brands = getOption( 'brands' );
  const lint = getOption( 'lint' );
  const tsc = getOption( 'tsc' );
  const omitted = getOption( 'omitted' );

  console.log( '<output>' );
  console.log( `brands: ${brands}` );
  console.log( `lint: ${lint}` );
  console.log( `tsc: ${tsc}` );
  console.log( `omitted: ${omitted}` );
  console.log( '</output>' );
}