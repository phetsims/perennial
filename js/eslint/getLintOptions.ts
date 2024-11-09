// Copyright 2024, University of Colorado Boulder

/**
 * Parse command line options for linting.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
// import getDataFile from '../common/getDataFile.js';
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
 * TODO: Careful eliminate this filter if we eliminate perennial-alias, see https://github.com/phetsims/perennial/issues/401 and https://github.com/phetsims/chipper/issues/1520
 */
export function getLintEverythingRepos(): Repo[] {
  return getDataFile( 'active-repos' ).filter( repo => repo !== 'perennial' );
}

// TODO: Rename to getLintCLIOptions, see https://github.com/phetsims/chipper/issues/1520
export default function getLintOptions(): Partial<LintOptions> {

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