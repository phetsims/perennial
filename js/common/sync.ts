// Copyright 2021, University of Colorado Boulder

/**
 * The main logic behind the sync grunt task (js/grunt/tasks/sync.ts).
 *
 * Generally a "one-stop shop" for all things needed to update the PhET Codebase. By default, this will:
 * - clone missing repos
 * - pull all repos
 * - set up tracking to the remote (only if needed)
 * - npm update all repos in perennial/data/npm-update (and --repo if provided)
 * - log working copy changes in repos that have them
 *
 * There are a variety of options listed below to customize this process to your development needs. The default behavior
 * is meant to remain the list of items that are needed to ensure that, no matter what, your local codebase is up to
 * date after running. With a few noted exceptions:
 * - transpiling: you can use --transpile here, but most devs want to run a watch process, so this is not on by default
 * - starting a server: devs have a variety of ways to host the PhET codebase locally, this goes beyond the scope of
 *   this file.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import fs from 'fs';
import _ from 'lodash';
import { IntentionalPerennialAny } from '../browser-and-node/PerennialTypes.js';
import { getOptionIfProvided } from '../grunt/tasks/util/getOption.js';
import cloneMissingRepos from './cloneMissingRepos.js';
import execute from './execute.js';
import getBranches from './getBranches.js';
import getRepoList from './getRepoList.js';
import gitCheckout from './gitCheckout.js';
import gitFetch from './gitFetch.js';
import gitIsClean from './gitIsClean.js';
import gitPullRebase from './gitPullRebase.js';
import gitRevParse from './gitRevParse.js';
import npmUpdate from './npmUpdate.js';
import { PERENNIAL_REPO_NAME } from './perennialRepoUtils.js';
import transpileAll from './transpileAll.js';
import chunkDelayed from './util/chunkDelayed.js';

export type SyncOptions = {
  // git pull repos, default to true. When false, will also skip checking out main.
  pull: boolean;

  // git checkout main before pulling each repo. This option is ignored if --pull=false. Default to true.
  checkoutMain: boolean;

  // git-status-styled output, default to true
  status: boolean;

  // npm update on all repos in perennial/data/npm-update, and the `--repo` option (if provided), defaults to true.
  // MK wishes this options was called "npm", but this option is recognized by node instead.
  npmUpdate: boolean;

  // Track ALL remote branches on all repos locally, check them out, and pull them (with rebase). It is recommended to
  // close webstorm and turn off the transpiler watch process before running with this option. Useful for doing batch
  // maintenance releases.
  allBranches: boolean;

  // Run the transpile step (without watching). Runs at the end of the process (after pulls and npm updates)
  transpile: boolean;

  // By default, the output of "git pull" in a repo will be logged, use this option to turn it off.
  logPull: boolean;

  // Log status of all repos, even if nothing changed with them. (only does something when --status is true)
  logAll: boolean;

  // Include command line formatting markings, useful for running from a terminal, but less so when running from another
  // script and javascript logging stdout.
  logFormatting: boolean;

  // When cloning missing repos, by default private repos are included, use this to opt out
  omitPrivate: boolean;

  // Pulling repos in parallel doesn't work on Windows git.  This is a workaround for that. It will also log as it
  // completes individual repo updates, since it takes more time. See https://github.com/phetsims/perennial/issues/361
  slowPull: boolean;

  // Run npm update on this repo as well. Automatically filled in if running as a grunt task. This repo to update will
  // be combined with the repos in `options.repoList`, and please note that the perennial repo that `sync` is run
  // from is ALWAYS included in script.
  repo: string;

  // Name of the file of repos in perennial/data/ to use for the update, defaults to "active-repos".
  // For example, `grunt sync --repoList=active-website-repos`. This list will be combined with `options.repo`, and please
  // note that the perennial repo that sync is run from is ALWAYS included in script.
  repoList: string;
};

const DEFAULTS = {
  pull: true,
  checkoutMain: true,
  status: true,
  npmUpdate: true,
  allBranches: false,
  transpile: false,
  logPull: true,
  logAll: false,
  logFormatting: true,
  omitPrivate: false,
  slowPull: false,
  repo: PERENNIAL_REPO_NAME,
  repoList: 'active-repos'
};

export const getSyncCLIOptions = (): SyncOptions => {

  return {
    pull: getOptionIfProvided( 'pull', DEFAULTS.pull ),
    checkoutMain: getOptionIfProvided( 'checkoutMain', DEFAULTS.checkoutMain ),
    status: getOptionIfProvided( 'status', DEFAULTS.status ),
    npmUpdate: getOptionIfProvided( 'npmUpdate', DEFAULTS.npmUpdate ),
    allBranches: getOptionIfProvided( 'allBranches', DEFAULTS.allBranches ),
    transpile: getOptionIfProvided( 'transpile', DEFAULTS.transpile ),
    logPull: getOptionIfProvided( 'logPull', DEFAULTS.logPull ),
    logAll: getOptionIfProvided( 'logAll', DEFAULTS.logAll ),
    logFormatting: getOptionIfProvided( 'logFormatting', DEFAULTS.logFormatting ),
    omitPrivate: getOptionIfProvided( 'omitPrivate', DEFAULTS.omitPrivate ),
    slowPull: getOptionIfProvided( 'slowPull', DEFAULTS.slowPull ),
    repo: getOptionIfProvided( 'repo', DEFAULTS.repo ),
    repoList: getOptionIfProvided( 'repoList', DEFAULTS.repoList )
  };
};

// A consistent way to know if a git pulling command pulled changes. Returns the stdout output
// of the pull command.
export function parsePullResult( stdout: string ): string | null {
  if ( stdout === 'Already up to date.\nCurrent branch main is up to date.\n' ||
       stdout === 'Already up to date.\n' ||
       stdout === 'Current branch main is up to date.\n' ) {
    return null;
  }
  else {
    return stdout.trim();
  }
}

/**
 * Returns success boolean
 */
export const sync = async ( providedOptions?: Partial<SyncOptions> ): Promise<boolean> => {

  const options = _.merge( {}, DEFAULTS, providedOptions );

  options.logAll && assert( options.status, '--logAll is only supported with --status=true, otherwise not all repos have something to report' );


  // The fastest way to update the codebase is to run clone-missing-repos as part of the parallel repoUpdate (for perennial)
  // Some options mandate that we clone repos first for correctness, before running parallel pull/status. If pulling all
  // branches, or printing all repos, it would be buggy to not have all repos checked out before kicking off the update
  // step. That said, don't default to the slower behavior unless we need to.
  const cloneFirst = options.allBranches || options.logAll;

  // ANSI escape sequences to move to the right (in the same line) or to apply or reset colors
  const moveRight = options.logFormatting ? ' \u001b[42G' : '\t';
  const red = options.logFormatting ? '\u001b[31m' : '';
  const green = options.logFormatting ? '\u001b[32m' : '';
  const bold = options.logFormatting ? '\u001b[1m' : '';
  const reset = options.logFormatting ? '\u001b[0m' : '';

  const data: Record<string, string> = {};
  let hasNoPullStatusProblems = true;

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

  function append( repo: string, message: string ): void {
    if ( data[ repo ] ) {
      data[ repo ] += '\n' + message;
    }
    else {
      data[ repo ] += `${bold}${repo}${reset}${message}`;
    }
  }

  const updateRepo = async ( repo: string, allRepos: string[] ) => {
    data[ repo ] = '';

    try {
      let pullResult: null | string = null;

      if ( fs.existsSync( `../${repo}` ) ) {
        if ( options.pull ) {
          if ( await gitIsClean( repo ) ) {
            if ( options.allBranches ) {
              await pullAllBranches( repo );
            }
            else {
              options.checkoutMain && await gitCheckout( repo, 'main' );
              pullResult = parsePullResult( await gitPullRebase( repo ) );
            }
          }
          else {
            hasNoPullStatusProblems = false;
            if ( !options.status ) {
              append( repo, `${moveRight}${red}not clean, skipping pull${reset}` );
            }
            else if ( repo === PERENNIAL_REPO_NAME && !options.slowPull ) {
              console.log( `${red}${PERENNIAL_REPO_NAME} is not clean, skipping pull${reset}\n` );
            }
          }
        }
      }
      else {
        // This will be handled later when perennial gets around to cloneMissingRepos
        return;
      }

      // Inline cloneMissingRepos so it can run in parallel with other repoUpdate steps.
      if ( !cloneFirst && repo === PERENNIAL_REPO_NAME ) {
        await cloneMissingReposInternal( allRepos );
      }

      if ( options.status ) {
        const symbolicRef = ( await execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], `../${repo}` ) ).trim();
        const branch = symbolicRef.replace( 'refs/heads/', '' ); // might be empty string
        const sha = await gitRevParse( repo, 'HEAD' );
        const status = await execute( 'git', [ 'status', '--porcelain' ], `../${repo}` );
        const track = branch ? ( await execute( 'git', [ 'for-each-ref', '--format=%(push:track,nobracket)', symbolicRef ], `../${repo}` ) ).trim() : '';

        let isGreen = false;
        if ( branch ) {
          const correctBranch = !options.checkoutMain || branch === 'main';
          isGreen = !status && correctBranch && !track.length;

          if ( !isGreen || options.logAll ) {
            append( repo, `${moveRight}${isGreen ? green : red}${branch}${reset} ${track}` );
          }
        }
        else {
          // if no branch, print our SHA (detached head)
          append( repo, `${moveRight}${red}${sha}${reset}` );
        }

        if ( status ) {
          if ( !isGreen || options.logAll ) {
            append( repo, status );
          }
        }

        hasNoPullStatusProblems = hasNoPullStatusProblems && isGreen;
      }

      // Log pull result after the status section, for formatting
      if ( options.logPull && pullResult ) {
        append( repo, ' ' + pullResult );
      }
    }
    catch( e ) {
      hasNoPullStatusProblems = false;
      append( repo, ` ERROR: ${e}` );
    }

    // Print progress as we go during slowPull, because it is slow
    if ( options.slowPull ) {
      ( options.logAll || data[ repo ].length ) && console.log( data[ repo ] );
    }
  };

  // Bundles a call to cloneMissingRepos with logging what repos were cloned
  async function cloneMissingReposInternal( reposToCheck: string[] ): Promise<void> {
    const missingRepos = await cloneMissingRepos( options.omitPrivate, reposToCheck );
    if ( missingRepos.length ) {
      console.log( `${green}Cloned:\n\t${missingRepos.join( '\n\t' )}${reset}` );
    }
  }

  // Get the list of repos that will be updated. Instead of having certain options override each other, just include the subset.
  function getRepos(): string[] {
    const repoList = getRepoList( options.repoList );

    // Always update perennial, to make sure cloning can happen
    return _.uniq( [ ...repoList, PERENNIAL_REPO_NAME, options.repo ] );
  }


  const startPullStatus = Date.now();
  console.log(); // extra space before the first logging
  let repos = getRepos();

  if ( options.pull || options.status ) {

    // See doc for "clone first"
    if ( cloneFirst ) {
      await gitIsClean( PERENNIAL_REPO_NAME ) && await gitPullRebase( PERENNIAL_REPO_NAME );
      await cloneMissingReposInternal( repos );

      // reload repo list after the above cloneMissingRepos changes
      repos = getRepos(); // eslint-disable-line require-atomic-updates
    }

    if ( options.slowPull ) {
      await chunkDelayed( repos, repo => updateRepo( repo, repos ), {
        waitPerItem: options.allBranches ? 1000 : 110,
        chunkSize: options.allBranches ? 20 : 15
      } );
    }
    else {
      await Promise.all( repos.map( repo => updateRepo( repo, repos ) ) );
      repos.forEach( repo => data[ repo ].length > 0 && console.log( data[ repo ] ) );
    }

    const color = hasNoPullStatusProblems ? green : red;
    console.log( `\n${color}-----=====] finished pull/status (${Date.now() - startPullStatus}ms) [=====-----${reset}\n` );
  }

  let npmUpdateProblems = false;
  if ( options.npmUpdate ) {
    const startNPM = Date.now();

    const npmUpdatesNeeded = getRepoList( 'npm-update' ).filter( repo => repos.includes( repo ) );
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

  let transpileProblems = false;
  if ( options.transpile ) {
    const startTranspile = Date.now();


    try {
      await transpileAll();
    }
    catch( e ) {
      transpileProblems = true;
      console.error( 'Error transpiling:', e );
    }
    console.log( `${transpileProblems ? red : green}-----=====] finished transpile (${Date.now() - startTranspile}ms) [=====-----${reset}\n` );
  }

  console.log( `\nsync complete in ${Date.now() - startPullStatus}ms` );

  return hasNoPullStatusProblems && !npmUpdateProblems && !transpileProblems;
};