// Copyright 2024, University of Colorado Boulder

/**
 * Generates the lists under perennial/data/, and if there were changes, will commit and push.'
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import generateData from '../generateData';

// TODO: Does this belong in grunt? See https://github.com/phetsims/chipper/issues/1461
( async () => generateData() )();