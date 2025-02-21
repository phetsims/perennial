// Copyright 2025, University of Colorado Boulder

import fs from 'fs';
import _ from 'lodash';
import execute from '../common/execute.js';
import getRepoList from '../common/getRepoList.js';
import { isOptionKeyProvided } from '../grunt/tasks/util/getOption.js';

/**
 * Checks on circular dependencies within PhET repositories, ignoring type-space loops
 *
 * Usage: cd perennial; sage run js/scripts/report-circular-dependencies.ts
 *
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
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
    console.log( trimmed );
    console.log( result.stderr );
  }

  process.exit( result.code );
} )();