// Copyright 2021, University of Colorado Boulder

const execute = require( '../common/execute.js' ).default;
const fs = require( 'fs' );
const _ = require( 'lodash' );

// constants
// Don't use getActiveRepos() since it cannot be run from the root
const contents = fs.readFileSync( `${__dirname}/../../data/active-repos`, 'utf8' ).trim();
const repos = contents.split( '\n' ).map( sim => sim.trim() );

/**
 * Pulls all repos (with rebase)
 *
 * USAGE:
 * cd ${root containing all repos}
 * node perennial/js/scripts/pull-all.js
 *
 * OPTIONS:
 * --batches=N - (1) by default, runing all pulls in parallel. Specify this to separate into N different synchronous chunks running repos/batches number of repos in parallel.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
( async () => {

  const batchesMatch = process.argv.join( ' ' ).match( /--batches=(\d+)/ );
  const batches = batchesMatch ? batchesMatch[ 1 ] : 1;
  const CHUNK_SIZE = repos.length / batches;

  for ( const chunkOfRepos of _.chunk( repos, CHUNK_SIZE ) ) {
    const childPulls = chunkOfRepos.map( repo => execute( 'git', [ 'pull', '--rebase' ], `${repo}`, {

      // resolve errors so Promise.all doesn't fail on first repo that cannot pull/rebase
      errors: 'resolve'
    } ) );
    const results = await Promise.all( childPulls );

    // Report results
    for ( let i = 0; i < results.length; i++ ) {
      const repo = chunkOfRepos[ i ];
      const result = results[ i ];

      if ( result.code === 0 && result.stderr === '' && ( result.stdout === 'Already up to date.\nCurrent branch main is up to date.\n' ||
                                                          result.stdout === 'Already up to date.\n' ||
                                                          result.stdout === 'Current branch main is up to date.\n' ) ) {
        // nothing to do
      }
      else {
        console.log( '##', repo );
        result.stdout.trim().length > 0 && console.log( result.stdout );
        result.stderr.trim().length > 0 && console.log( result.stderr );
        result.error && console.log( result.error );
      }
    }
  }
} )();