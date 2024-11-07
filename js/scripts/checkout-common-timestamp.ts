// Copyright 2024, University of Colorado Boulder

/**
 * Check out a specific timestamp for common-code repositories
 * --timestamp : the timestamp to check things out for, e.g. --timestamp="Jan 08 2018"
 * --skipNpmUpdate : If provided, will prevent the usual npm update
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import _ from 'lodash';
import winston from 'winston';
import getRepoList from '../common/getRepoList.js';
import gitFetchCheckout from '../common/gitFetchCheckout.js';
import gitFromTimestamp from '../common/gitFromTimestamp.js';
import npmUpdate from '../common/npmUpdate.js';
import getOption from '../grunt/tasks/util/getOption.js';

( async () => {
  const timestamp = getOption( 'timestamp' );
  assert( timestamp, 'Requires specifying a timestamp with --timestamp={{BRANCH}}' );
  const includeNpmUpdate = !getOption( 'skipNpmUpdate' );

  const repos = _.uniq( [
    ...getRepoList( 'active-common-sim-repos' ),
    'assert',
    'brand',
    'joist',
    'query-string-machine',
    'sherpa',
    'utterance-queue',
    'phet-core',
    'tandem',
    'axon',
    'dot',
    'kite',
    'scenery',
    'scenery-phet',
    'sun',
    'twixt',
    'phetcommon',
    'phet-lib',
    'chipper',
    'perennial-alias',
    'phetmarks'
  ] ).sort();

  for ( const repo of repos ) {
    winston.info( repo );

    try {
      const sha = await gitFromTimestamp( repo, 'main', timestamp );
      await gitFetchCheckout( repo, sha );
    }
    catch( e ) {
      winston.error( `skipping ${repo}: ${e}` );
    }
  }

  if ( includeNpmUpdate ) {
    await npmUpdate( 'chipper' );
    await npmUpdate( 'perennial-alias' );
  }
} )();