// Copyright 2021, University of Colorado Boulder

/**
 * Checks status for repos, and prints it out to the console
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const cloneMissingRepos = require( '../common/cloneMissingRepos' );
const execute = require( '../common/execute' );
const getActiveRepos = require( '../common/getActiveRepos' );
const getBranches = require( '../common/getBranches' );
const gitCheckout = require( '../common/gitCheckout' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPullRebase = require( '../common/gitPullRebase' );
const gitRevParse = require( '../common/gitRevParse' );
const npmUpdate = require( '../common/npmUpdate' );
const winston = require( 'winston' );
const _ = require( 'lodash' );

winston.default.transports.console.level = 'error';

// ANSI escape sequences to move to the right (in the same line) or to apply or reset colors
const moveRight = ' \u001b[42G';
const red = '\u001b[31m';
const green = '\u001b[32m';
const reset = '\u001b[0m';

const repos = getActiveRepos();
const data = {};

// If this is provided, we'll track ALL remote branches, check them out, and pull them (with rebase)
const allBranches = process.argv.includes( '--allBranches' );

const getStatus = async repo => {
  data[ repo ] = '';

  try {
    if ( await gitIsClean( repo ) ) {
      if ( allBranches ) {
        const branches = await getBranches( repo );
        for ( const branch of branches ) {
          // Only track the remote branch if it hasn't been tracked yet
          if ( ( await execute( 'git', [ 'rev-parse', '--verify', branch ], `../${repo}`, { errors: 'resolve' } ) ).code !== 0 ) {
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

        // Go back to master
        await gitCheckout( repo, 'master' );
      }
      else {
        await gitCheckout( repo, 'master' );
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
      isGreen = !status && branch === 'master' && !track.length;

      if ( !isGreen || process.argv.includes( '--all' ) ) {
        data[ repo ] += `${repo}${moveRight}${isGreen ? green : red}${branch}${reset} ${track}\n`;
      }
    }
    else {
      // if no branch, print our SHA (detached head)
      data[ repo ] += `${repo}${moveRight}${red}${sha}${reset}\n`;
    }

    if ( status ) {
      if ( !isGreen || process.argv.includes( '--all' ) ) {
        data[ repo ] += status + '\n';
      }
    }
  }
  catch( e ) {
    data[ repo ] += `${repo} ERROR: ${e}`;
  }
};

( async () => {
  await Promise.all( repos.map( repo => getStatus( repo ) ) );

  repos.forEach( repo => {
    process.stdout.write( data[ repo ] );
  } );

  console.log( `${_.every( repos, repo => !data[ repo ].length ) ? green : red}-----=====] finished pulls [=====-----${reset}\n` );

  await npmUpdate( 'chipper' );
  await npmUpdate( 'perennial' );
  await npmUpdate( 'perennial-alias' );

  console.log( `${_.every( repos, repo => !data[ repo ].length ) ? green : red}-----=====] finished npm [=====-----${reset}\n` );
} )();
