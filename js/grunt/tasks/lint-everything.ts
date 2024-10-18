// Copyright 2024, University of Colorado Boulder

/**
 * lint all js files for all repos
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import grunt from 'grunt';
import getDataFile from '../../common/getDataFile';
import lint from '../lint.js';
import parseLintOptions from './util/parseLintOptions.js';

( async () => {

  const activeRepos = getDataFile( 'active-repos' ).filter( repo => repo !== 'perennial-alias' ); // remove duplicate perennial copy

  // The APIs are the same for these two versions of lint support
  const lintReturnValue = await lint( parseLintOptions( { repos: activeRepos } ) );

  // Output results on errors.
  if ( !lintReturnValue.ok ) {
    grunt.fail.fatal( 'Lint failed' );
  }
} )();