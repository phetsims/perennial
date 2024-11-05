// Copyright 2024, University of Colorado Boulder

/**
 * If no repos are provided, activeRepos will be used as the list of repos to lint (equivalent to --all)
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import getOption from '../grunt/tasks/util/getOption.js';
import getDataFile from '../common/getDataFile.js';
import _ from 'lodash';

export type LintOptions = {
  repos: Repo[];
  cache: boolean;
  fix: boolean;
};
export type RequiredReposInLintOptions = Partial<LintOptions> & Pick<LintOptions, 'repos'>;

export type Repo = string;

export default function getLintOptions( options?: Partial<LintOptions> ): LintOptions {
  // TODO: Optionize would be nice, https://github.com/phetsims/perennial/issues/369

  // Two apis for turning this off.
  const cache = !( getOption( 'clean' ) || getOption( 'disable-eslint-cache' ) );

  const lintOptions = _.assignIn( {
    repos: [] as string[], // the repos to lint

    // Cache results for a speed boost.
    // Use --clean or --disable-eslint-cache to disable the cache; useful for developing rules.
    cache: cache,

    // Fix things that can be auto-fixed (written to disk)
    fix: !!getOption( 'fix' )
  }, options );

  if ( lintOptions.repos.length === 0 || getOption( 'all' ) ) {

    // remove duplicate perennial copy
    lintOptions.repos = getDataFile( 'active-repos' ).filter( repo => repo !== 'perennial-alias' );
  }
  return lintOptions;
}