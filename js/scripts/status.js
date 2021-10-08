// Copyright 2021, University of Colorado Boulder

/**
 * Checks status for repos, and prints it out to the console
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const getActiveRepos = require( '../common/getActiveRepos' );
const gitStatus = require( '../common/gitStatus' );
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
};

( async () => {
  await Promise.all( repos.map( repo => getStatus( repo ) ) );
  repos.forEach( repo => {
    process.stdout.write( data[ repo ] );
  } );
} )();
