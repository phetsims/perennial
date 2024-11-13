// Copyright 2024, University of Colorado Boulder

/**
 * Parse command line options for linting.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import getOption, { isOptionKeyProvided } from '../grunt/tasks/util/getOption.js';
import getDataFile from '../common/getDataFile.js';

export type LintOptions = {
  clean?: boolean;
  fix?: boolean;
  processes?: number;
};

export const DEFAULT_MAX_PROCESSES = 6;

export type Repo = string;

/**
 * Get the list of repos to lint when doing lint-everything or lint --all
 * Linting runs in perennial-alias by default, so skip perennial when running all, see https://github.com/phetsims/chipper/issues/1520
 * TODO: Careful eliminate this filter if we eliminate perennial-alias, see https://github.com/phetsims/perennial/issues/401
 * TODO: Please be aware of this opt out during review of https://github.com/phetsims/chipper/issues/1520
 * TODO: MK: This is too much of a gotcha to me. Most importantly if you are making changes to either perennial-alias or perennial. I don't believe that the extra repo would change the overall time enough. https://github.com/phetsims/chipper/issues/1520
 */
export function getLintEverythingRepos(): Repo[] {
  return getDataFile( 'active-repos' ).filter( repo => repo !== 'perennial' );
}

export default function getLintCLIOptions(): Partial<LintOptions> {

  const lintOptions: Partial<LintOptions> = {};

  // Max number of processes to divide up the work
  if ( isOptionKeyProvided( 'processes' ) ) {
    lintOptions.processes = getOption( 'processes' );
  }

  // Two apis for turning this off.
  // Cache results for a speed boost.
  // Use --clean or --disable-eslint-cache to disable the cache; useful for developing rules.
  if ( isOptionKeyProvided( 'clean' ) || isOptionKeyProvided( 'disable-eslint-cache' ) ) {
    lintOptions.clean = true;
  }

  // Fix things that can be auto-fixed (written to disk)
  if ( isOptionKeyProvided( 'fix' ) ) {
    lintOptions.fix = getOption( 'fix' );
  }

  return lintOptions;
}