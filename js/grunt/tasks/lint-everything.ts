// Copyright 2024, University of Colorado Boulder

/**
 * lint all js files for all repos
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import grunt from 'grunt';
import getDataFile from '../../common/getDataFile';
import lint from '../lint.js';
import getOption from './util/getOption';

( async () => {

  // --disable-eslint-cache disables the cache, useful for developing rules
  const cache = !getOption( 'disable-eslint-cache' );
  const activeRepos = getDataFile( 'active-repos' ).filter( repo => repo !== 'perennial-alias' ); // remove duplicate perennial copy
  const fix = getOption( 'fix' );
  const chipAway = getOption( 'chip-away' );
  const showProgressBar = !getOption( 'hide-progress-bar' );

  // The APIs are the same for these two versions of lint support
  const lintReturnValue = await lint( activeRepos, {
    cache: cache,
    fix: fix,
    chipAway: chipAway,
    showProgressBar: showProgressBar
  } );

  // Output results on errors.
  if ( !lintReturnValue.ok ) {
    grunt.fail.fatal( 'Lint failed' );
  }
} )();