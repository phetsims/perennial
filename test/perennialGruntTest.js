// Copyright 2017, University of Colorado Boulder

/**
 * Unit tests, run with `qunit` at the top-level of perennial. May need `npm install -g qunit` beforehand, if it hasn't been run yet.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

const execute = require( '../js/common/execute' );
const gruntCommand = require( '../js/common/gruntCommand' );
const qunit = require( 'qunit' );

qunit.module( 'Perennial grunt tasks' );

qunit.test( 'Checkout target', async ( assert ) => {
  assert.timeout( 120000 );
  await execute( gruntCommand, [ 'checkout-target', '--repo=chains', '--target=1.9' ], '.' );
  await execute( gruntCommand, [ 'checkout-master', '--repo=chains' ], '.' );
  assert.expect( 0 );
} );

qunit.test( 'NPM update', async ( assert ) => {
  assert.timeout( 120000 );
  await execute( gruntCommand, [ 'npm-update', '--repo=chains' ], '.' );
  assert.expect( 0 );
} );

qunit.test( 'Bumper dev phet,phet-io', async ( assert ) => {
  assert.timeout( 600000 );
  // TODO: Remove these once it goes to master
  await execute( 'git', [ 'checkout', '2.0'], '../chipper' );
  await execute( 'git', [ 'checkout', 'chipper2.0'], '../phet-io-wrappers' );
  await execute( gruntCommand, [ 'dev', '--repo=bumper', '--brands=phet,phet-io', '--noninteractive' ], '.' );
  assert.expect( 0 );
} );
