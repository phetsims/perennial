// Copyright 2024, University of Colorado Boulder
/**
 * Type checks *.ts files. Named after deno check. Automatically uses "-b" as appropriate for project references.
 *
 * Usage:
 * grunt check
 *
 * Options (can be combined):
 * --all: check all repos
 * --clean: clean before checking (will still do the check, unlike running tsc directly)
 * --absolute: Updates the output formatting to integrate well with Webstorm as an "External Tool"
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import check from '../check.js';
import getOption from './util/getOption.ts';
import getRepo from './util/getRepo.js';

export const checkTask = ( async () => check( {
  repo: getRepo(),
  all: !!getOption( 'all' ),
  clean: !!getOption( 'clean' ),
  pretty: getOption( 'pretty', true ),
  verbose: !!getOption( 'verbose' ),
  silent: !!getOption( 'silent' ),
  absolute: !!getOption( 'absolute' )
} ) )();