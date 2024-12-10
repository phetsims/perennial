// Copyright 2024, University of Colorado Boulder

/**
 * lint all js files for all repos
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import grunt from 'grunt';
import getLintCLIOptions, { getLintEverythingRepos } from '../../eslint/getLintCLIOptions.js';
import lint from '../../eslint/lint.js';

( async () => {
  const lintSuccess = await lint( getLintEverythingRepos(), getLintCLIOptions() );

  // Output results on errors.
  if ( !lintSuccess ) {
    grunt.fail.fatal( 'Lint failed' );
  }
} )();