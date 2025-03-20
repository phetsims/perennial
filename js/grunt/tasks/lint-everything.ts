// Copyright 2024, University of Colorado Boulder

/**
 * lint all supported files for all repos
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import getLintCLIOptions, { getLintEverythingRepos } from '../../eslint/getLintCLIOptions.js';
import lint from '../../eslint/lint.js';

( async () => {
  const lintSuccess = await lint( getLintEverythingRepos(), getLintCLIOptions() );

  // Output results on errors.
  if ( !lintSuccess ) {
    console.log( 'Lint failed' );
    process.exit( 1 );
  }
} )();