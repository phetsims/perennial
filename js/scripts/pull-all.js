// Copyright 2021, University of Colorado Boulder

const execute = require( '../common/execute' );
const _ = require( 'lodash' ); // eslint-disable-line no-unused-vars
const fs = require( 'fs' );

// constants
// Don't use getActiveRepos() since it cannot be run from the root
const contents = fs.readFileSync( 'perennial/data/active-repos', 'utf8' ).trim();
const repos = contents.split( '\n' ).map( sim => sim.trim() );

/**
 * Pulls all repos (with rebase)
 *
 * USAGE:
 * cd ${root containing all repos}
 * node perennial/js/scripts/pull-all.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
( async () => {

  const a = repos.map( repo => execute( 'git', [ 'pull', '--rebase' ], `${repo}`, {

    // resolve errors so Promise.all doesn't fail on first repo that cannot pull/rebase
    errors: 'resolve'
  } ) );
  const out = await Promise.all( a );

  // Report results
  for ( let i = 0; i < a.length; i++ ) {
    const repo = repos[ i ];
    const o = out[ i ];

    if ( o.code === 0 && o.stderr === '' && ( o.stdout === 'Already up to date.\nCurrent branch master is up to date.\n' ||
                                              o.stdout === 'Already up to date.\n' ||
                                              o.stdout === 'Current branch master is up to date.\n' ) ) {

      // nothing to do
    }
    else {
      console.log( '##', repo );
      o.stdout.trim().length > 0 && console.log( o.stdout );
      o.stderr.trim().length > 0 && console.log( o.stderr );
      o.error && console.log( o.error );
    }
  }
} )();