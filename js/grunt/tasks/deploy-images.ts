// Copyright 2024, University of Colorado Boulder


/**
 * Rebuilds all images
 * --simulation : Optional. If present, only the given simulation will receive images from main. If absent, all sims' +
 * will receive images from main.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import deployImages from '../deployImages';
import getOption from './util/getOption';

( async () => {
  console.log( getOption( 'simulation' ) );
  const simulation = getOption( 'simulation' ) || null;
  await deployImages( { simulation: simulation } );
} )();