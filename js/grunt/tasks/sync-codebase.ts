// Copyright 2021, University of Colorado Boulder

/**
 * Generally a "one-stop shop" for all things needed to update the PhET Codebase. This will:
 * - clone missing repos
 * - pull all repos
 * - set up tracking to the remote (only if needed)
 * - npm update in chipper/perennial/perennial-alias/cwd-repo
 * - transpile (see --transpile)
 * - Conduct pull and tracking on all branches associated with the repo (see --allBranches) (useful for doing batch MRs)
 *
 * usage:
 * grunt sync-codebase
 * ################ or
 * cd perennial/
 * sage run js/grunt/tasks/sync-codebase.ts
 *
 * NOTE: Cannot be run from git repo root, must be from inside a repo.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import fs from 'fs';
import _ from 'lodash';
import winston from 'winston';
import { IntentionalPerennialAny } from '../../browser-and-node/PerennialTypes.js';
import cloneMissingRepos from '../../common/cloneMissingRepos.js';
import execute from '../../common/execute.js';
import getActiveRepos from '../../common/getActiveRepos.js';
import getBranches from '../../common/getBranches.js';
import getRepoList from '../../common/getRepoList.js';
import gitCheckout from '../../common/gitCheckout.js';
import gitFetch from '../../common/gitFetch.js';
import gitIsClean from '../../common/gitIsClean.js';
import gitPullRebase from '../../common/gitPullRebase.js';
import gitRevParse from '../../common/gitRevParse.js';
import npmUpdate from '../../common/npmUpdate.js';
import { PERENNIAL_REPO_NAME } from '../../common/perennialRepoUtils.js';
import transpileAll from '../../common/transpileAll.js';
import chunkDelayed from '../../common/util/chunkDelayed.js';
import getOption from './util/getOption.js';

winston.default.transports.console.level = 'error';

const options = {

  // If this is provided, we'll track ALL remote branches, check them out, and pull them (with rebase)
  allBranches: getOption( 'allBranches' ),

  // Additionally run the transpiler after pulling
  transpile: getOption( 'transpile' ),

  // Log all repos, even if nothing changed with them.
  allRepos: getOption( 'all' ),

  // Pulling repos in parallel doesn't work on Windows git.  This is a workaround for that. It will also log as it
  // completes individual repo updates, since it takes more time.
  slowPull: getOption( 'slowPull' ),

  // If running as a grunt task, you will be running from a particular repo
  repo: getOption( 'repo' )
};

const cloneFirst = options.allBranches || options.allRepos;

// ANSI escape sequences to move to the right (in the same line) or to apply or reset colors
const moveRight = ' \u001b[42G';
const red = '\u001b[31m';
const green = '\u001b[32m';
const reset = '\u001b[0m';

const data: Record<string, string> = {};

async function pullAllBranches( repo: string ): Promise<void> {
  const branches = await getBranches( repo );
  for ( const branch of branches ) {
    // Only track the remote branch if it hasn't been tracked yet
    if ( ( await execute( 'git', [ 'rev-parse', '--verify', branch ], `../${repo}`, { errors: 'resolve' } ) ).code !== 0 ) {
      await gitFetch( repo );
      await execute( 'git', [ 'branch', '--track', branch, `origin/${branch}` ], `../${repo}` );
    }
    await gitCheckout( repo, branch );

    try {
      await gitPullRebase( repo );
    }
    catch( e ) {

      // Likely there is no tracking info set up on the local branch
      await execute( 'git', [ 'branch', `--set-upstream-to=origin/${branch}`, branch ], `../${repo}` );
      await gitPullRebase( repo );
    }
  }

  // Go back to main
  await gitCheckout( repo, 'main' );
}

const updateRepo = async ( repo: string ) => {
  data[ repo ] = '';

  try {
    if ( fs.existsSync( `../${repo}` ) ) {

      if ( await gitIsClean( repo ) ) {
        if ( options.allBranches ) {
          await pullAllBranches( repo );
        }
        else {
          await gitCheckout( repo, 'main' );
          await gitPullRebase( repo );
        }
      }
      else if ( repo === PERENNIAL_REPO_NAME ) {
        console.log( `${red}${PERENNIAL_REPO_NAME} is not clean, skipping pull${reset}` );
      }
    }
    else {
      // This will be handled later when perennial gets around to cloneMissingRepos
      return;
    }

    if ( !cloneFirst && repo === PERENNIAL_REPO_NAME ) {
      await cloneMissingReposInternal();
    }

    const symbolicRef = ( await execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], `../${repo}` ) ).trim();
    const branch = symbolicRef.replace( 'refs/heads/', '' ); // might be empty string
    const sha = await gitRevParse( repo, 'HEAD' );
    const status = await execute( 'git', [ 'status', '--porcelain' ], `../${repo}` );
    const track = branch ? ( await execute( 'git', [ 'for-each-ref', '--format=%(push:track,nobracket)', symbolicRef ], `../${repo}` ) ).trim() : '';

    let isGreen = false;
    if ( branch ) {
      isGreen = !status && branch === 'main' && !track.length;

      if ( !isGreen || options.allRepos ) {
        data[ repo ] += `${repo}${moveRight}${isGreen ? green : red}${branch}${reset} ${track}\n`;
      }
    }
    else {
      // if no branch, print our SHA (detached head)
      data[ repo ] += `${repo}${moveRight}${red}${sha}${reset}\n`;
    }

    if ( status ) {
      if ( !isGreen || options.allRepos ) {
        data[ repo ] += status + '\n';
      }
    }
  }
  catch( e ) {
    data[ repo ] += `${repo} ERROR: ${e}`;
  }

  // Print progress as we go during slowPull, because it is slow
  if ( options.slowPull ) {
    ( options.allRepos || data[ repo ].length ) && process.stdout.write( data[ repo ] );
  }
};

// Bundles a call to cloneMissingRepos with logging what repos were cloned
async function cloneMissingReposInternal(): Promise<void> {
  const missingRepos = await cloneMissingRepos();
  if ( missingRepos.length ) {
    console.log( `${green}Cloned:\n\t${missingRepos.join( '\n\t' )}${reset}` );
  }
}

///////////////////////////////
// Main iife
( async () => {

  // If pulling all branches, or printing all repos, we need to clone before going through the parallel loop.
  if ( cloneFirst ) {
    await gitIsClean( PERENNIAL_REPO_NAME ) && await gitPullRebase( PERENNIAL_REPO_NAME );
    await cloneMissingReposInternal();
  }

  // load active repos after the above cloneMissingRepos
  const repos = getActiveRepos();

  if ( options.slowPull ) {
    await chunkDelayed( repos, repo => updateRepo( repo ), {
      waitPerItem: options.allBranches ? 1000 : 100,
      chunkSize: options.allBranches ? 20 : 10
    } );
  }
  else {
    await Promise.all( repos.map( repo => updateRepo( repo ) ) );
    repos.forEach( repo => process.stdout.write( data[ repo ] ) );
  }

  console.log( `\n${_.every( repos, repo => !data[ repo ].length ) ? green : red}-----=====] finished pulls [=====-----${reset}\n` );

  let npmUpdateProblems = false;
  const npmUpdatesNeeded = getRepoList( 'npm-update' );
  try {

    const promises: Promise<IntentionalPerennialAny>[] = npmUpdatesNeeded.map( repo => npmUpdate( repo ) );

    const cwdRepo = options.repo;
    cwdRepo && !npmUpdatesNeeded.includes( cwdRepo ) && fs.existsSync( `../${cwdRepo}/package.json` ) && promises.push( npmUpdate( cwdRepo ) );

    await Promise.all( promises );
  }
  catch( e ) {
    npmUpdateProblems = true;
    console.error( 'Error npm updating:', e );
  }

  console.log( `${npmUpdateProblems ? red : green}-----=====] finished npm [=====-----${reset}\n` );

  if ( options.transpile ) {
    let transpileProblems = false;

    try {
      await transpileAll();
    }
    catch( e ) {
      transpileProblems = true;
      console.error( 'Error transpiling:', e );
    }
    console.log( `${transpileProblems ? red : green}-----=====] finished transpile [=====-----${reset}\n` );
  }
} )();