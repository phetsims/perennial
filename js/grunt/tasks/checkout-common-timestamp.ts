// Copyright 2024, University of Colorado Boulder

/**
 * Check out a specific timestamp for common-code repositories
 * --timestamp : the timestamp to check things out for, e.g. --timestamp="Jan 08 2018"
 * --skipNpmUpdate : If provided, will prevent the usual npm update
 *
 * TODO: Move to perennial/js/scripts and inline module, https://github.com/phetsims/perennial/issues/370
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import checkoutCommonTimestamp from '../../common/checkoutCommonTimestamp';
import getOption from './util/getOption';

( async () => {
  assert( getOption( 'timestamp' ), 'Requires specifying a timestamp with --timestamp={{BRANCH}}' );
  await checkoutCommonTimestamp( getOption( 'timestamp' ), !getOption( 'skipNpmUpdate' ) );
} )();