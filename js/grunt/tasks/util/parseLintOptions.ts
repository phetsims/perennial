// Copyright 2024, University of Colorado Boulder

import _ from 'lodash';
import getDataFile from '../../../common/getDataFile.js';
import { LintOptions } from '../../lint.js';
import getOption from './getOption.js';

/**
 * If no repos are provided, activeRepos will be used as the list of repos to lint (equivalent to --all)
 * TODO: Move to the lint module directly. https://github.com/phetsims/chipper/issues/1489
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
const parseLintOptions = ( options?: Partial<LintOptions> ): LintOptions => {
  // TODO: Optionize would be nice, https://github.com/phetsims/perennial/issues/369

  // Two apis for turning this off.
  const cache = !( getOption( 'clean' ) || getOption( 'disable-eslint-cache' ) );

  const lintOptions = _.assignIn( {
    repos: [] as string[], // the repos to lint

    // Cache results for a speed boost.
    // Use --clean or --disable-eslint-cache to disable the cache; useful for developing rules.
    cache: cache,

    // Fix things that can be auto-fixed (written to disk)
    fix: !!getOption( 'fix' ),

    // Prints responsible dev info for any lint errors for easier GitHub issue creation.
    chipAway: !!getOption( 'chip-away' ),

    // Show a progress bar while running, based on the current repo index in the provided list parameter
    showProgressBar: !getOption( 'hide-progress-bar' )
  }, options );

  if ( lintOptions.repos.length === 0 || getOption( 'all' ) ) {

    // remove duplicate perennial copy
    lintOptions.repos = getDataFile( 'active-repos' ).filter( repo => repo !== 'perennial-alias' );
  }
  return lintOptions;
};

export default parseLintOptions;