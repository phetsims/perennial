// Copyright 2024, University of Colorado Boulder

import getOption from './getOption';

/**
 * Test that grunt parses options as expected.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default function(): void {

// grunt test-grunt --brands=a,b,c --lint=false --noTSC
  const brands = getOption( 'brands' );
  const lint = getOption( 'lint' );
  const noTSC = getOption( 'noTSC' );
  const omitted = getOption( 'omitted' );

  console.log( '<output>' );
  console.log( `brands: ${brands}` );
  console.log( `lint: ${lint}` );
  console.log( `noTSC: ${noTSC}` );
  console.log( `omitted: ${omitted}` );
  console.log( '</output>' );
}