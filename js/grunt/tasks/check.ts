// Copyright 2024, University of Colorado Boulder
/**
 * Type checks *.ts files. Named after deno check. Automatically uses "-b" as appropriate for project references.
 *
 * Usage:
 * grunt check
 *
 * Options (can be combined):
 * --everything: check all repos
 * --clean: clean before checking (will still do the check, unlike running tsc directly)
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import check from '../check.js';
import getOption from './util/getOption.ts';
import getRepo from './util/getRepo';

export const checkTask = ( async () => check( {
  repo: getRepo(),
  everything: getOption( 'everything' ),
  clean: getOption( 'clean' ),
  pretty: getOption( 'pretty' ) === undefined || getOption( 'pretty' ) === true
} ) )();