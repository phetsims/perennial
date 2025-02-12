// Copyright 2024, University of Colorado Boulder
/**
 * Type checks *.ts files. Automatically uses "-b" as appropriate for project references.
 *
 * Usage:
 * grunt type-check
 *
 * Options (can be combined):
 * --all: check all repos
 * --clean: clean before checking (will still do the check, unlike running tsc directly)
 * --absolute: Updates the output formatting to integrate well with Webstorm as an "External Tool"
 * --pretty=false: Use pretty formatting (default is true)
 * --verbose: Provide extra output from tsc
 * --silent: Prevent all output, even if verbose or absolute flags are set
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import _ from 'lodash';
import typeCheck, { CheckOptions } from '../typeCheck.js';
import getOption, { isOptionKeyProvided } from './util/getOption.js';
import getRepo from './util/getRepo.js';

const checkCLIOptions: Partial<CheckOptions> = {};

if ( isOptionKeyProvided( 'all' ) ) {
  checkCLIOptions.all = true;
}
if ( isOptionKeyProvided( 'clean' ) ) {
  checkCLIOptions.clean = true;
}
if ( isOptionKeyProvided( 'absolute' ) ) {
  checkCLIOptions.absolute = true;
}
if ( isOptionKeyProvided( 'pretty' ) ) {
  checkCLIOptions.pretty = getOption( 'pretty' );
}
if ( isOptionKeyProvided( 'verbose' ) ) {
  checkCLIOptions.verbose = true;
}
if ( isOptionKeyProvided( 'silent' ) ) {
  checkCLIOptions.silent = true;
}

const defaultOptions = {
  repo: getRepo()
};
export const typeCheckPromise = ( async () => {
  const success = await typeCheck( _.assignIn( defaultOptions, checkCLIOptions ) );
  if ( !success ) {
    process.exit( 1 );
  }
} )();