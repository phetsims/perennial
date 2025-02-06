// Copyright 2021, University of Colorado Boulder

/**
 * Generally a "one-stop shop" for all things needed to update the PhET Codebase. By default, this will:
 * - clone missing repos
 * - pull all repos
 * - set up tracking to the remote (only if needed)
 * - npm update all repos in perennial/data/npm-update (and --repo if provided)
 * - log working copy changes in repos that have them
 *
 * This script uses perennial/data/active-repos as the list of repos.
 *
 * There are a variety of options listed below to customize this process to your development needs. The default behavior
 * is meant to remain the list of items that are needed to ensure that, no matter what, your local codebase is up to
 * date after running. With a few noted exceptions:
 * - transpiling: you can use --transpile here, but most devs want to run a watch process, so this is not on by default
 * - starting a server: devs have a variety of ways to host the PhET codebase locally, this goes beyond the scope of
 *   this file.
 *
 *
 * usage:
 * grunt sync-codebase
 * ## or
 * cd perennial/
 * sage run js/grunt/tasks/sync-codebase.ts
 *
 * NOTE: Cannot be run from git repo root, must be from inside a repo (like most grunt commands).
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
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
import getOption, { isOptionKeyProvided } from './util/getOption.js';

winston.default.transports.console.level = 'error';

const options = {

  // git pull repos, default to true. When false, will also skip checking out main.
  gitPull: isOptionKeyProvided( 'pull' ) ? getOption( 'pull' ) : true,

  // git checkout main before pulling each repo. This option is ignored if --pull=false. Default to true.
  checkoutMain: isOptionKeyProvided( 'checkoutMain' ) ? getOption( 'checkoutMain' ) : true,

  // git-status-styled output, default to true
  gitStatus: isOptionKeyProvided( 'status' ) ? getOption( 'status' ) : true,

  // npm update on all repos in perennial/data/npm-update, and the `--repo` option (if provided), defaults to true.
  // MK wishes this options was called "npm", but this option is recognized by node instead.
  npmUpdate: isOptionKeyProvided( 'npmUpdate' ) ? getOption( 'npmUpdate' ) : true,

  // Track ALL remote branches on all repos locally, check them out, and pull them (with rebase). It is recommended to
  // close webstorm and turn off the transpiler watch process before running with this option. Useful for doing batch
  // maintenance releases.
  allBranches: getOption( 'allBranches' ),

  // Run the transpile step (without watching). Runs at the end of the process (after pulls and npm updates)
  transpile: getOption( 'transpile' ),

  // Log status of all repos, even if nothing changed with them. (only does something when --status is true)
  allRepos: getOption( 'all' ),

  // When closing missing repos, by default private repos are included, use this to opt out
  omitPrivate: getOption( 'omitPrivate' ),

  // Pulling repos in parallel doesn't work on Windows git.  This is a workaround for that. It will also log as it
  // completes individual repo updates, since it takes more time. See https://github.com/phetsims/perennial/issues/361
  slowPull: getOption( 'slowPull' ),

  // Run npm update on this repo as well. Automatically filled in if running as a grunt task.
  repo: getOption( 'repo' )
};

options.allRepos && assert( options.gitStatus, '--all is only supported with --status=true, otherwise not all repos have something to report' );

// Some options require a slower form of this program, where we clone repos first, before running parallel pull/status
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

// DUPLICATION ALERT: these hard coded strings are also listed in pull-all.js, please change both cases.
function parsePullResult( stdout: string ): string | null {
  if ( stdout === 'Already up to date.\nCurrent branch main is up to date.\n' ||
       stdout === 'Already up to date.\n' ||
       stdout === 'Current branch main is up to date.\n' ) {
    return null;
  }
  else {
    return stdout.trim();
  }
}

function append( repo: string, message: string ): void {
  if ( data[ repo ] ) {
    data[ repo ] += '\n' + message;
  }
  else {
    data[ repo ] += repo + message;
  }
}

const updateRepo = async ( repo: string ) => {
  data[ repo ] = '';

  try {
    let pullResult: null | string = null;

    if ( fs.existsSync( `../${repo}` ) ) {
      if ( options.gitPull ) {
        if ( await gitIsClean( repo ) ) {
          if ( options.allBranches ) {
            await pullAllBranches( repo );
          }
          else {
            options.checkoutMain && await gitCheckout( repo, 'main' );
            pullResult = parsePullResult( await gitPullRebase( repo ) );
          }
        }
        else if ( repo === PERENNIAL_REPO_NAME && !options.slowPull ) {
          console.log( `${red}${PERENNIAL_REPO_NAME} is not clean, skipping pull${reset}` );
        }
      }

    }
    else {
      // This will be handled later when perennial gets around to cloneMissingRepos
      return;
    }

    if ( !cloneFirst && repo === PERENNIAL_REPO_NAME ) {
      await cloneMissingReposInternal();
    }

    if ( options.gitStatus ) {
      const symbolicRef = ( await execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], `../${repo}` ) ).trim();
      const branch = symbolicRef.replace( 'refs/heads/', '' ); // might be empty string
      const sha = await gitRevParse( repo, 'HEAD' );
      const status = await execute( 'git', [ 'status', '--porcelain' ], `../${repo}` );
      const track = branch ? ( await execute( 'git', [ 'for-each-ref', '--format=%(push:track,nobracket)', symbolicRef ], `../${repo}` ) ).trim() : '';

      let isGreen = false;
      if ( branch ) {
        isGreen = !status && branch === 'main' && !track.length;

        if ( !isGreen || options.allRepos ) {
          append( repo, `${moveRight}${isGreen ? green : red}${branch}${reset} ${track}` );
        }
      }
      else {
        // if no branch, print our SHA (detached head)
        append( repo, `${moveRight}${red}${sha}${reset}` );
      }

      if ( status ) {
        if ( !isGreen || options.allRepos ) {
          append( repo, status );
        }
      }
    }

    // Log pull result after the status section, for formatting
    if ( pullResult ) {
      append( repo, ' ' + pullResult );
    }
  }
  catch( e ) {
    append( repo, ` ERROR: ${e}` );
  }

  // Print progress as we go during slowPull, because it is slow
  if ( options.slowPull ) {
    ( options.allRepos || data[ repo ].length ) && console.log( data[ repo ] );
  }
};

// Bundles a call to cloneMissingRepos with logging what repos were cloned
async function cloneMissingReposInternal(): Promise<void> {
  const missingRepos = await cloneMissingRepos( options.omitPrivate );
  if ( missingRepos.length ) {
    console.log( `${green}Cloned:\n\t${missingRepos.join( '\n\t' )}${reset}` );
  }
}

///////////////////////////////
// Main iife
( async () => {

  const startPullStatus = Date.now();
  console.log(); // extra space before the first logging

  // If pulling all branches, or printing all repos, we need to clone before going through the parallel loop.
  if ( cloneFirst ) {
    await gitIsClean( PERENNIAL_REPO_NAME ) && await gitPullRebase( PERENNIAL_REPO_NAME );
    await cloneMissingReposInternal();
  }

  // load active repos after the above cloneMissingRepos
  const repos = getActiveRepos();

  if ( options.slowPull ) {
    await chunkDelayed( repos, repo => updateRepo( repo ), {
      waitPerItem: options.allBranches ? 1000 : 110,
      chunkSize: options.allBranches ? 20 : 15
    } );
  }
  else {
    await Promise.all( repos.map( repo => updateRepo( repo ) ) );
    repos.forEach( repo => data[ repo ].length > 0 && console.log( data[ repo ] ) );
  }

  const color = _.every( repos, repo => !data[ repo ].length ) ? green : red;
  console.log( `\n${color}-----=====] finished pull/status (${Date.now() - startPullStatus}ms) [=====-----${reset}\n` );

  if ( options.npmUpdate ) {
    const startNPM = Date.now();

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

    console.log( `${npmUpdateProblems ? red : green}-----=====] finished npm (${Date.now() - startNPM}ms) [=====-----${reset}\n` );
  }

  if ( options.transpile ) {
    const startTranspile = Date.now();

    let transpileProblems = false;

    try {
      await transpileAll();
    }
    catch( e ) {
      transpileProblems = true;
      console.error( 'Error transpiling:', e );
    }
    console.log( `${transpileProblems ? red : green}-----=====] finished transpile (${Date.now() - startTranspile}ms) [=====-----${reset}\n` );
  }

  console.log( `\nFinished in ${Date.now() - startPullStatus}ms` );
} )();