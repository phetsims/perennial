// Copyright 2024, University of Colorado Boulder
/**
 * Check out main branch for all repos in git root
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */


import checkoutMainAll from '../checkoutMainAll.js';
import getOption from './util/getOption.js';

( async () => checkoutMainAll( getOption( 'branch' ) ) )();