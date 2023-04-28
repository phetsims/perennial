// Copyright 2021, University of Colorado Boulder

const execute = require( '../common/execute' );
const _ = require( 'lodash' ); // eslint-disable-line no-unused-vars
const fs = require( 'fs' );

// constants
// Don't use getActiveRepos() since it cannot be run from the root
const contents = fs.readFileSync( 'perennial/data/active-repos', 'utf8' ).trim();
const repos = contents.split( '\n' ).map( sim => sim.trim() );

/**
 * Push all active-repos
 *
 * USAGE:
 * cd ${root containing all repos}
 * node perennial/js/scripts/push-all.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
( async () => {

  // const a = repos.map( repo => execute( 'git', 'log --branches --not --remotes --simplify-by-decoration --decorate --oneline'.split(' '), `${repo}`, {
  const promises = repos.map( repo => execute( 'git', 'log --branches --not --remotes --simplify-by-decoration --decorate --oneline'.split( ' ' ), `${repo}`, {

    // resolve errors so Promise.all doesn't fail on first repo that cannot pull/rebase
    errors: 'resolve'
  } ) );
  const results = await Promise.all( promises );

  // Find out which repos need to be pushed
  const pushRepos = [];
  for ( let i = 0; i < results.length; i++ ) {
    const repo = repos[ i ];
    const result = results[ i ];

    if ( result.code === 0 && result.stdout.trim().length === 0 && result.stderr.trim().length === 0 ) {

      // was up-to-date
    }
    else {

      // needs to push
      pushRepos.push( repo );
    }
  }

  const pushPromises = pushRepos.map( repo => execute( 'git', [ 'push' ], `${repo}`, {

    // resolve errors so Promise.all doesn't fail on first repo that cannot pull/rebase
    errors: 'resolve'
  } ) );
  const pushResults = await Promise.all( pushPromises );

  // Report results
  for ( let i = 0; i < pushRepos.length; i++ ) {
    const repo = pushRepos[ i ];
    const returnObject = pushResults[ i ];

    console.log( repo );
    if ( returnObject.stdout.trim().length > 0 ) {
      console.log( returnObject.stdout );
    }
    if ( returnObject.stderr.trim().length > 0 ) {
      console.log( returnObject.stderr );
    }
  }
} )();