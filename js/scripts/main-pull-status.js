// Copyright 2021, University of Colorado Boulder

/**
 * Generally a "one-stop shop" for all things needed to update the PhET Codebase. This will:
 * - clone missing repos
 * - pull all repos
 * - set up tracking to the remote (only if needed)
 * - npm update in chipper/perennial/perennial-alias
 * - transpile (see --transpile)
 * - Conduct pull and tracking on all branches associated with the repo (see --allBranches) (useful for doing batch MRs)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const cloneMissingRepos = require( '../common/cloneMissingRepos' );
const execute = require( '../common/execute' );
const getActiveRepos = require( '../common/getActiveRepos' );
const getBranches = require( '../common/getBranches' );
const gitCheckout = require( '../common/gitCheckout' );
const gitFetch = require( '../common/gitFetch' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPullRebase = require( '../common/gitPullRebase' );
const gitRevParse = require( '../common/gitRevParse' );
const npmUpdate = require( '../common/npmUpdate' );
const outputJSAll = require( '../common/outputJSAll' );
const winston = require( 'winston' );
const _ = require( 'lodash' );

winston.default.transports.console.level = 'error';

// If this is provided, we'll track ALL remote branches, check them out, and pull them (with rebase)
const allBranches = process.argv.includes( '--allBranches' );

// Additionally run the transpiler after pulling
const transpile = process.argv.includes( '--transpile' );

// Log all repos, even if nothing changed with them.
const allRepos = process.argv.includes( '--all' );

// Pulling repos in parallel doesn't work on Windows git.  This is a workaround for that.
const slowPull = process.argv.includes( '--slowPull' );

// ANSI escape sequences to move to the right (in the same line) or to apply or reset colors
const moveRight = ' \u001b[42G';
const red = '\u001b[31m';
const green = '\u001b[32m';
const reset = '\u001b[0m';

const repos = getActiveRepos();
const data = {};

const getStatus = async repo => {
  data[ repo ] = '';

  try {
    if ( await gitIsClean( repo ) ) {
      if ( allBranches ) {
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
      else {
        await gitCheckout( repo, 'main' );
        await gitPullRebase( repo );
      }
    }
    else if ( repo === 'perennial' ) {
      console.log( `${red}perennial is not clean, skipping pull${reset}` );
    }

    if ( repo === 'perennial' ) {
      await cloneMissingRepos();
    }

    const symbolicRef = ( await execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], `../${repo}` ) ).trim();
    const branch = symbolicRef.replace( 'refs/heads/', '' ); // might be empty string
    const sha = await gitRevParse( repo, 'HEAD' );
    const status = await execute( 'git', [ 'status', '--porcelain' ], `../${repo}` );
    const track = branch ? ( await execute( 'git', [ 'for-each-ref', '--format=%(push:track,nobracket)', symbolicRef ], `../${repo}` ) ).trim() : '';

    let isGreen = false;
    if ( branch ) {
      isGreen = !status && branch === 'main' && !track.length;

      if ( !isGreen || allRepos ) {
        data[ repo ] += `${repo}${moveRight}${isGreen ? green : red}${branch}${reset} ${track}\n`;
      }
    }
    else {
      // if no branch, print our SHA (detached head)
      data[ repo ] += `${repo}${moveRight}${red}${sha}${reset}\n`;
    }

    if ( status ) {
      if ( !isGreen || allRepos ) {
        data[ repo ] += status + '\n';
      }
    }
  }
  catch( e ) {
    data[ repo ] += `${repo} ERROR: ${e}`;
  }
};

( async () => {

  if ( slowPull ) {

    // Await each repo to pull them in sequence.
    for ( const repo of repos ) {
      await getStatus( repo );
    }
  }
  else {
    await Promise.all( repos.map( repo => getStatus( repo ) ) );
  }

  repos.forEach( repo => {
    process.stdout.write( data[ repo ] );
  } );

  console.log( `${_.every( repos, repo => !data[ repo ].length ) ? green : red}-----=====] finished pulls [=====-----${reset}\n` );

  await npmUpdate( 'chipper' );
  await npmUpdate( 'perennial' );
  await npmUpdate( 'perennial-alias' );

  console.log( `${_.every( repos, repo => !data[ repo ].length ) ? green : red}-----=====] finished npm [=====-----${reset}\n` );

  if ( transpile ) {
    await outputJSAll();

    console.log( `${_.every( repos, repo => !data[ repo ].length ) ? green : red}-----=====] finished transpile [=====-----${reset}\n` );
  }
} )();