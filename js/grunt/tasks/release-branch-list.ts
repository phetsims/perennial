// Copyright 2024-2026, University of Colorado Boulder

/**
 * Prints out a list of all release branches that would need maintenance patches
 *   --repo : Only show branches for a specific repository
 *   --order=<ORDER> : alphabetical|date
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * */

import assert from 'assert';
import _ from 'lodash';
import { assertIsValidRepoName } from '../../common/assertIsValidRepoName.js';
import getOption from './util/getOption.js';
import { Checkout } from '../../common/Checkout.js';
import { ReleaseBranch } from '../../common/ReleaseBranch.js';
import pLimit from 'p-limit';

( async () => {

  // winston.default.transports.console.level = 'error';

  const repo = getOption( 'repo' )?.startsWith( 'perennial' ) ? null : getOption( 'repo' );
  const order = getOption( 'order' ) || 'alphabetical';

  if ( repo ) {
    assertIsValidRepoName( repo );
  }

  assert( order === 'alphabetical' || order === 'date', `unsupported order type: ${order}` );

  const releaseBranches = await Checkout.getMaintainedReleaseBranches();

  console.log( `Found ${releaseBranches.length} release branches, inspecting for divergence dates` );

  const limit = pLimit( 10 ); // concurrent git operations

  let structures: { releaseBranch: ReleaseBranch; timestamp: number }[] = [];

  await Promise.all( releaseBranches.map( releaseBranch => limit( async () => {
    structures.push( {
      releaseBranch: releaseBranch,
      timestamp: await releaseBranch.checkout.getDivergingTimestamp()
    } );
  } ) ) );

  if ( order === 'date' ) {
    structures = _.sortBy( structures, struct => struct.timestamp );
  }
  else {
    structures = _.sortBy( structures, struct => struct.releaseBranch.toString() );
  }

  console.log( '\nRelease branches:\n{repo} {branch} {brand[,brand]+} {date}\n' );
  for ( const struct of structures ) {
    console.log( `${struct.releaseBranch.toString()} ${new Date( struct.timestamp ).toISOString().split( 'T' )[ 0 ]}` );
  }
} )();