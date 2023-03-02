// Copyright 2021, University of Colorado Boulder

/**
 * Rebases and pushes repos that are ahead of origin, with consolidated status/error output.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( '../common/execute' );
const getActiveRepos = require( '../common/getActiveRepos' );
const gitIsClean = require( '../common/gitIsClean' );
const gitPullRebase = require( '../common/gitPullRebase' );
const gitPush = require( '../common/gitPush' );
const winston = require( 'winston' );

winston.default.transports.console.level = 'error';

// ANSI escape sequences to move to the right (in the same line) or to apply or reset colors
const red = '\u001b[31m';
const green = '\u001b[32m';
const reset = '\u001b[0m';

const repos = getActiveRepos();
const data = {};
let ok = true;

const rebasePushNeeded = async repo => {
  data[ repo ] = '';

  try {
    const symbolicRef = ( await execute( 'git', [ 'symbolic-ref', '-q', 'HEAD' ], `../${repo}` ) ).trim();
    const branch = symbolicRef.replace( 'refs/heads/', '' );
    const trackShort = branch ? ( await execute( 'git', [ 'for-each-ref', '--format=%(push:trackshort)', symbolicRef ], `../${repo}` ) ).trim() : '';

    // If it's ahead at all
    if ( trackShort.includes( '>' ) ) {
      if ( await gitIsClean( repo ) ) {
        await gitPullRebase( repo );
      }
      else {
        data[ repo ] += `${red}${repo} not clean, skipping pull${reset}\n`;
      }

      if ( branch ) {
        await gitPush( repo, branch );
        data[ repo ] += `${green}${repo} pushed\n`;
      }
      else {
        data[ repo ] += `${red}${repo} no branch, skipping push${reset}\n`;
        ok = false;
      }
    }
  }
  catch( e ) {
    data[ repo ] += `${repo} ERROR: ${e}\n`;
    ok = false;
  }
};

( async () => {
  await Promise.all( repos.map( repo => rebasePushNeeded( repo ) ) );

  repos.forEach( repo => {
    process.stdout.write( data[ repo ] );
  } );

  console.log( `\n${ok ? green : red}-----=====] finished [=====-----${reset}\n` );
} )();
