// Copyright 2024, University of Colorado Boulder

/**
 * lint all js files for all repos
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import grunt from 'grunt';
import lint from '../../eslint/lint.js';
import getLintOptions, { getLintEverythingRepos } from '../../eslint/getLintOptions.js';

( async () => {
  const lintSuccess = await lint( getLintEverythingRepos(), getLintOptions() );

  // Output results on errors.
  if ( !lintSuccess ) {
    grunt.fail.fatal( 'Lint failed' );
  }
} )();