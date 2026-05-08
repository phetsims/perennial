// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns the brand suffix, given a brand name
 * (e.g. 'phet' => '-phet', 'phet-io' => '-phetio', 'adapted-from-phet' => '-adaptedFromPhet')
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

export const brandToSuffix = ( brand: string ): string => {
  if ( brand === 'phet-io' ) {
    return 'phetio';
  }
  return brand.split( '-' ).map( ( bit, index ) => {
    return ( index > 0 ? bit[ 0 ].toUpperCase() : bit[ 0 ] ) + bit.slice( 1 );
  } ).join( '' );
};
