// Copyright 2021, University of Colorado Boulder

/**
 * Pulls all repos (with rebase).
 *
 * Deprecated, use grunt/tasks/sync.ts instead.
 *
 * USAGE:
 * cd ${root containing all repos}
 * sage run perennial/js/scripts/pull-all.js
 *
 * cd perennial
 * sage run js/scripts/pull-all.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
( async () => {
  console.log( 'DEPRECATED: pull-all.sh is deprecated, please use `sage run js/grunt/tasks/sync.ts --status=false --npmUpdate=false --checkoutMain=false`' );

  require( 'process' ).argv.push(
    '--npmUpdate=false',
    '--status=false',
    '--checkoutMain=false'
  );

  require( '../grunt/tasks/sync' );
} )();