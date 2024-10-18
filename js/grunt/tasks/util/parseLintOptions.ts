// Copyright 2024, University of Colorado Boulder

import _ from 'lodash';
import { LintOptions } from '../../lint.js';
import getOption from './getOption.js';

/**
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
const parseLintOptions = ( options?: Partial<LintOptions> ): LintOptions => {
  //  TODO: Why is there no hard error when you remove the lodash import here? It picks it up from the browser-side phet-types.d.ts, https://github.com/phetsims/chipper/issues/1489
  return _.assignIn( {

    // Cache results for a speed boost. Use --disable-eslint-cache to disable the cache; useful for developing rules.
    cache: !getOption( 'disable-eslint-cache' ),

    // Fix things that can be auto-fixed (written to disk)
    fix: !!getOption( 'fix' ),

    // Prints responsible dev info for any lint errors for easier GitHub issue creation.
    chipAway: !!getOption( 'chip-away' ),

    // Show a progress bar while running, based on the current repo index in the provided list parameter
    showProgressBar: !getOption( 'hide-progress-bar' )
  }, options );
};

export default parseLintOptions;