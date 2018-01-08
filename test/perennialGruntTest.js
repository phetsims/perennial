// Copyright 2017, University of Colorado Boulder

/**
 * Unit tests, run with `mocha`
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
