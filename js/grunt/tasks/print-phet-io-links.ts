// Copyright 2024, University of Colorado Boulder

/**
 * Print the current list of all phet-io sims' links
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import getPhetioLinks from '../../common/getPhetioLinks.js';

( async () => {
  const phetioLinks = await getPhetioLinks();

  console.log( 'Latest Links:' );
  console.log( `\n${phetioLinks.join( '\n' )}` );
} )();