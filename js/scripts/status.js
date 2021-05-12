// Copyright 2021, University of Colorado Boulder

/**
 * Checks status for repos, and prints it out to the console
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

const execute = require( '../common/execute' );
const getActiveRepos = require( '../common/getActiveRepos' );
const getBranch = require( '../common/getBranch' );
const gitRevParse = require( '../common/gitRevParse' );
const simMetadata = require( '../common/simMetadata' );
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

  const symbolicRef = await execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], `../${repo}` );
  const branch = await getBranch( repo ); // might be empty string
  const sha = await gitRevParse( repo, 'HEAD' );
  const status = await execute( 'git', [ 'status', '--porcelain' ], `../${repo}` );

  if ( branch ) {
    // Safe method to get ahead/behind counts, see http://stackoverflow.com/questions/2969214/git-programmatically-know-by-how-much-the-branch-is-ahead-behind-a-remote-branc

    // get the tracking-branch name
    const trackingBranch = await execute( 'git', [ 'for-each-ref', '--format=\'%(upstream:short)\'', symbolicRef ], `../${repo}` );

    // e.g. behind-count + '\t' + ahead-count
    const counts = await execute( 'git', [ 'rev-list', '--left-right', '--count', `${trackingBranch}...HEAD` ], `../${repo}` );

    const behind = parseInt( counts.split( '\t' )[ 0 ], 10 );
    const ahead = parseInt( counts.split( '\t' )[ 1 ], 10 );

    data[ repo ] += `${repo}${moveRight}${!status && branch === 'master' && ahead === 0 ? green : red}${branch}${reset}${ahead === 0 ? '' : ` ahead ${ahead}`}${behind === 0 ? '' : ` behind ${behind}`}\n`;
  }
  else {
    // if no branch, print our SHA (detached head)
    data[ repo ] += `${repo}${moveRight}${red}${sha}${reset}\n`;
  }

  if ( status ) {
    data[ repo ] += status + '\n';
  }
};

( async() => {
  await Promise.all( repos.map( repo => getStatus( repo ) ) );
  repos.forEach( repo => {
    process.stdout.write( data[ repo ] );
  } );
} )();
