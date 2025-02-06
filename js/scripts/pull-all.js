// Copyright 2021, University of Colorado Boulder

const execute = require( '../common/execute' ).default;
const fs = require( 'fs' );
const path = require( 'path' );
const chunkDelayed = require( '../common/util/chunkDelayed' ).default;

// constants
// Don't use getActiveRepos() since it cannot be run from the root
const contents = fs.readFileSync( `${__dirname}/../../data/active-repos`, 'utf8' ).trim();
const repos = contents.split( '\n' ).map( sim => sim.trim() );

/**
 * Pulls all repos (with rebase)
 *
 * USAGE:
 * cd ${root containing all repos}
 * sage run perennial/js/scripts/pull-all.js
 *
 * cd perennial
 * sage run js/scripts/pull-all.js
 *
 * OPTIONS:
 * --batches=N - (1) by default, running all pulls in parallel. Specify this to separate into N different chunks where
 * each next one is delayed before creating child processes. This helps to solve the OpenSSL SSL_ERROR_SYSCALL bug in https://github.com/phetsims/perennial/issues/361
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
( async () => {

  const batchesMatch = process.argv.join( ' ' ).match( /--batches=(\d+)/ );
  const batches = batchesMatch ? batchesMatch[ 1 ] : 1;
  const results = await chunkDelayed( repos, repo => {
    return execute( 'git', [ 'pull', '--rebase' ], path.join( __dirname, `../../../${repo}` ), {

      // resolve errors so Promise.all doesn't fail on first repo that cannot pull/rebase
      errors: 'resolve'
    } );
  }, { chunkSize: repos.length / batches } );

  // Report results
  for ( let i = 0; i < results.length; i++ ) {
    const repo = repos[ i ];
    const result = results[ i ];

    // DUPLICATION ALERT: these hard coded strings are also listed in sync-codebase.parsePullResult(), please change both cases.
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
} )();