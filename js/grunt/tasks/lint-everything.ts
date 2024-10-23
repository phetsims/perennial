// Copyright 2024, University of Colorado Boulder

/**
 * lint all js files for all repos
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import grunt from 'grunt';
import lint, { getLintOptions } from '../lint.js';

( async () => {
  const lintReturnValue = await lint( getLintOptions() );

  // Output results on errors.
  if ( !lintReturnValue.ok ) {
    grunt.fail.fatal( 'Lint failed' );
  }
} )();