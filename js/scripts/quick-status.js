// Copyright 2021, University of Colorado Boulder

/**
 * A fast-running status check. NOTE: Only checks the local status, does NOT check the server. Use the full status for
 * that if needed.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( '../common/execute' );
const getActiveRepos = require( '../common/getActiveRepos' );
const gitRevParse = require( '../common/gitRevParse' );
const winston = require( 'winston' );

winston.default.transports.console.level = 'error';

// ANSI escape sequences to move to the right (in the same line) or to apply or reset colors
const moveRight = ' \u001b[42G';
const red = '\u001b[31m';
const green = '\u001b[32m';
const reset = '\u001b[0m';

const repos = getActiveRepos();
const data = {};

const getStatus = async repo => {
  data[ repo ] = '';

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
};

( async () => {
  await Promise.all( repos.map( repo => getStatus( repo ) ) );
  repos.forEach( repo => {
    process.stdout.write( data[ repo ] );
  } );
} )();
