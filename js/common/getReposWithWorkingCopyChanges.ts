// Copyright 2024, University of Colorado Boulder

/**
 * Detect uncommitted changes in each repo.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import _ from 'lodash';
import path from 'path';
import { Repo } from '../browser-and-node/PerennialTypes.js';
import winston from '../npm-dependencies/winston.js';
import dirname from './dirname.js';
import execute, { ExecuteResult } from './execute.js';
import getActiveRepos from './getActiveRepos.js';

// @ts-expect-error ok to use import meta here
const __dirname = dirname( import.meta.url );

const RESOLVE_ERRORS = { errors: 'resolve' } as const;

export default async function getReposWithWorkingCopyChanges(): Promise<Repo[]> {

  const repos = getActiveRepos();

  const changedRepos: string[] = [];

  const promises = repos.map( async repo => {
    const cwd = path.resolve( __dirname, '../../../', repo );

    const check = ( result: ExecuteResult ) => {
      result.code !== 0 && changedRepos.push( repo );
      return result.code === 0;
    };

    // Detect uncommitted changes in each repo:
    // https://stackoverflow.com/questions/3878624/how-do-i-programmatically-determine-if-there-are-uncommitted-changes
    // git diff-index --quiet HEAD --
    // This will error if the diff-index shows any changes in the repo, otherwise error is null.
    check( await execute( 'git', [ 'update-index', '--refresh' ], cwd, RESOLVE_ERRORS ) ) &&
    check( await execute( 'git', [ 'diff-index', '--quiet', 'HEAD', '--' ], cwd, RESOLVE_ERRORS ) );
  } );

  await Promise.all( promises );

  const changedReposString = changedRepos.join( ', ' );
  assert( _.isEqual( changedRepos, _.uniq( changedRepos ) ), `changed repos is not list of unique items: ${changedReposString}` );
  winston.info( 'detected changed repos: ' + changedReposString );

  return changedRepos;
}