// Copyright 2025, University of Colorado Boulder

/**
 * Checks on circular dependencies within PhET repositories, ignoring type-space loops
 *
 * Usage: cd perennial; sage run js/scripts/report-circular-dependencies.ts
 *
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

import fs from 'fs';
import _ from 'lodash';
import execute from '../common/execute.js';
import getRepoList from '../common/getRepoList.js';
import { isOptionKeyProvided } from '../grunt/tasks/util/getOption.js';

( async () => {
  const isCommonOnly = isOptionKeyProvided( 'common' );

  const commonRepos = getRepoList( 'active-common-sim-repos' );
  const simRepos = getRepoList( 'active-sims' );
  const runnableRepos = getRepoList( 'active-runnables' );

  const potentialRepos = _.uniq( [
    ...commonRepos,

    ...( isCommonOnly ? [] : [ ...simRepos, ...runnableRepos ] )
  ] ).sort();

  const repos = potentialRepos.filter( repo => {
    return fs.existsSync( `../${repo}/js` );
  } );

  const npxCommand = process.platform.startsWith( 'win' ) ? 'npx.cmd' : 'npx';

  const result = await execute( npxCommand, [ 'madge', '--warning', '--circular', ...repos.map( repo => `../${repo}/js` ) ], '.', { errors: 'resolve' } );

  // Regex allows for "circular dependency" and "circular dependencies"
  const regExp = /Found \d+ circular dependen/;
  const success = !regExp.test( result.stderr );
  if ( !success ) {
    const endIndex = result.stdout.indexOf( '✖ Skipped ' );
    const trimmed = result.stdout.slice( 0, endIndex );
    const cycles = trimmed.split( /\n\s*\n/ );

    // Filter cycles reported by madge to exclude cycles that involve 'sherpa/' dependencies,
    // since those are not maintained by PhET
    const cyclesWithoutSherpa = cycles
      .filter( cycle => !cycle.includes( 'sherpa/' ) )
      .filter( cycle => cycle.length > 0 );

    // Filter cycles reported by madge to include only lines that represent circular dependencies
    // (contain '>'). This removes leading lines in the madge output.
    const filteredCycles = cyclesWithoutSherpa.filter( cycle => cycle.includes( '>' ) );

    if ( filteredCycles.length > 0 ) {

      // Logging cyclesWithoutSherpa because we do want to see the leading madge lines.
      console.log( cyclesWithoutSherpa.join( '\n\n' ) );
      console.log( result.stderr );
    }
    else {

      // All cycles exclusively involve 'sherpa/' dependencies.
      process.exit( 0 );
    }
  }

  process.exit( result.code );
} )();