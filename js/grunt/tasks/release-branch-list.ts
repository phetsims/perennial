// Copyright 2024-2026, University of Colorado Boulder

/**
 * Prints out a list of all release branches that would need maintenance patches
 *   --repo : Only show branches for a specific repository
 *   --order=<ORDER> : alphabetical|date
 *
 * TODO: currently need this for TTY: npx tsx ./js/grunt/tasks/release-branch-list.ts https://github.com/phetsims/totality/issues/140
 * TODO: see console.log( {stdoutTTY: process.stdout.isTTY,stderrTTY: process.stderr.isTTY} ); https://github.com/phetsims/totality/issues/140
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
import { gitFetch } from '../../common/gitFetch.js';
import winston from 'winston';
import cliProgress from 'cli-progress';

( async () => {

  winston.default.transports.console.level = 'error';

  const progressBar = new cliProgress.SingleBar( {}, cliProgress.Presets.shades_classic );

  const repo = getOption( 'repo' )?.startsWith( 'perennial' ) ? null : getOption( 'repo' );
  const order = getOption( 'order' ) || 'alphabetical';

  if ( repo ) {
    assertIsValidRepoName( repo );
  }

  assert( order === 'alphabetical' || order === 'date', `unsupported order type: ${order}` );

  // Fetch, so we get up-to-date timestamps below
  // TODO: how many other operations need this at the start? https://github.com/phetsims/totality/issues/140
  await gitFetch();

  const releaseBranches = await Checkout.getMaintainedReleaseBranches();

  console.log( `Found ${releaseBranches.length} release branches, inspecting for divergence dates` );

  const limit = pLimit( 10 ); // concurrent git operations

  let structures: { releaseBranch: ReleaseBranch; timestamp: number }[] = [];

  progressBar.start( releaseBranches.length, 0 );

  let countDone = 0;

  await Promise.all( releaseBranches.map( releaseBranch => limit( async () => {
    structures.push( {
      releaseBranch: releaseBranch,
      timestamp: await releaseBranch.checkout.getDivergingTimestamp()
    } );
    progressBar.update( ++countDone );
  } ) ) );

  progressBar.stop();

  if ( order === 'date' ) {
    structures = _.sortBy( structures, struct => struct.timestamp );
  }
  else {
    structures = _.sortBy( structures, struct => struct.releaseBranch.toString() );
  }

  console.log( '\nRelease branches:\n{repo} {branch} {brand[,brand]+} {date}\n' );
  for ( const struct of structures ) {
    console.log( `${new Date( struct.timestamp ).toISOString().split( 'T' )[ 0 ]} ${struct.releaseBranch.toString()}` );
  }
} )();