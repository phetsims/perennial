// Copyright 2025, University of Colorado Boulder

/**
 * Checks on circular dependencies within PhET repositories, ignoring type-space loops
 *
 * Usage: cd perennial; sage run js/scripts/report-circular-dependencies.ts [--include-sherpa]
 *   --include-sherpa : Include sherpa/ third-party dependencies in the analysis output.
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
  const includeSherpa = isOptionKeyProvided( 'include-sherpa' );

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

  // Exclude third-party sherpa/ dependencies unless requested, since PhET does not maintain them.
  const madgeArguments = [
    'madge',
    '--warning',
    '--circular',
    ...( includeSherpa ? [] : [ '--exclude', '^sherpa/' ] ),
    ...repos.map( repo => `../${repo}/js` )
  ];

  const result = await execute( npxCommand, madgeArguments, '.', { errors: 'resolve' } );

  // Regex allows for "circular dependency" and "circular dependencies"
  const regExp = /Found \d+ circular dependen/;
  const success = !regExp.test( result.stderr );
  if ( !success ) {
    const endIndex = result.stdout.indexOf( '✖ Skipped ' );
    const trimmed = result.stdout.slice( 0, endIndex );

    console.log( trimmed );
    console.log( result.stderr );
  }

  process.exit( result.code );
} )();
