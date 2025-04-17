// Copyright 2024, University of Colorado Boulder

/**
 * Test that grunt parses options as expected.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import getOption from './getOption.js';

export default function testGruntOptions(): void {

// grunt test-grunt --brands=a,b,c --lint=false --type-check=false
  const brands = getOption( 'brands' );
  const lint = getOption( 'lint' );
  const typeCheck = getOption( 'type-check' );
  const omitted = getOption( 'omitted' );

  console.log( '<output>' );
  console.log( `brands: ${brands}` );
  console.log( `lint: ${lint}` );
  console.log( `type-check: ${typeCheck}` );
  console.log( `omitted: ${omitted}` );
  console.log( '</output>' );
}