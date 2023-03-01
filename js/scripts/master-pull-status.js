// Copyright 2021, University of Colorado Boulder

/**
 * Checks status for repos, and prints it out to the console
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */


const cloneMissingRepos = require( '../common/cloneMissingRepos' );
const getActiveRepos = require( '../common/getActiveRepos' );
const gitCheckout = require( '../common/gitCheckout' );
const gitPull = require( '../common/gitPull' );
const gitStatus = require( '../common/gitStatus' );
const npmUpdate = require( '../common/npmUpdate' );
const winston = require( 'winston' );

winston.default.transports.console.level = 'error';

// ANSI escape sequences to move to the right (in the same line) or to apply or reset colors
const moveRight = '\u001b[42G';
const red = '\u001b[31m';
const green = '\u001b[32m';
const reset = '\u001b[0m';

const repos = getActiveRepos();
const data = {};

const getStatus = async repo => {
  data[ repo ] = '';

  try {
    await gitCheckout( repo, 'master' );
    await gitPull( repo );

    const status = await gitStatus( repo );

    let isGreen = false;
    if ( status.branch ) {
      isGreen = !status.status && status.branch === 'master' && status.ahead === 0;

      if ( !isGreen || process.argv.includes( '--all' ) ) {
        data[ repo ] += `${repo}${moveRight}${isGreen ? green : red}${status.branch}${reset}${status.ahead === 0 ? '' : ` ahead ${status.ahead}`}${status.behind === 0 ? '' : ` behind ${status.behind}`}\n`;
      }
    }
    else {
      // if no branch, print our SHA (detached head)
      data[ repo ] += `${repo}${moveRight}${red}${status.sha}${reset}\n`;
    }

    if ( status.status ) {
      if ( !isGreen || process.argv.includes( '--all' ) ) {
        data[ repo ] += status.status + '\n';
      }
    }
  }
  catch( e ) {
    data[ repo ] += `${repo} ERROR: ${e}`;
  }
};

( async () => {
  try {
    await gitPull( 'perennial' );
    await cloneMissingRepos();
  }
  catch( e ) {
    console.log( `perennial/clone failed:\n${e}` );
  }

  await Promise.all( repos.map( repo => getStatus( repo ) ) );

  console.log( 'pulled' );

  await npmUpdate( 'chipper' );
  await npmUpdate( 'perennial' );
  await npmUpdate( 'perennial-alias' );

  repos.forEach( repo => {
    process.stdout.write( data[ repo ] );
  } );

  console.log( 'done' );
} )();
