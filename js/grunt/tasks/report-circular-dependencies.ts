// Copyright 2025, University of Colorado Boulder

/**
 * Checks out circular dependencies within PhET repositories
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
import _ from 'lodash';
import { isOptionKeyProvided } from './util/getOption.js';
import getRepoList from '../../common/getRepoList.js';
import fs from 'fs';
import execute from '../../common/execute.js';

( async () => {
  const isCommonOnly = isOptionKeyProvided( 'common' );

  const commonRepos = getRepoList( 'active-common-sim-repos' );
  const simRepos = getRepoList( 'active-sims' );
  const runnableRepos = getRepoList( 'active-runnables' );

  const potentialRepos = _.uniq( [
    ...commonRepos,

    ...( isCommonOnly ? [] : simRepos ),
    ...( isCommonOnly ? [] : runnableRepos )
  ] ).sort();

  const repos = potentialRepos.filter( repo => {
    return fs.existsSync( `../${repo}/js` );
  } );

  const npxCommand = process.platform.startsWith( 'win' ) ? 'npx.cmd' : 'npx';

  const result = await execute( npxCommand, [ 'madge', '--warning', '--circular', ...repos.map( repo => `../${repo}/js` ) ], '.', { errors: 'resolve' } );

  console.log( result.stdout );
  console.log( result.stderr );

  // if ( result.code !== 0 ) {
  //   console.error( 'madge failed - likely has circular dependencies' );
  //   process.exit( 1 );
  // }
} )();