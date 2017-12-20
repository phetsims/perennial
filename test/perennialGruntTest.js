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

describe( 'Perennial grunt tasks', () => {
  it( 'Checkout target', async () => {
    await execute( gruntCommand, [ 'checkout-target', '--repo=chains', '--target=1.9' ], '.' );
    await execute( gruntCommand, [ 'checkout-master', '--repo=chains' ], '.' );
  } ).timeout( 120000 );

  it( 'NPM update', async () => {
    await execute( gruntCommand, [ 'npm-update', '--repo=chains' ], '.' );
  } ).timeout( 120000 );

  // TODO: uninteractive version of this
  // it( 'Chains dev deploy', async () => {
  //   await execute( gruntCommand, [ 'dev', '--repo=chains', '--brands=phet,phet-io' ], '.' );
  // } ).timeout( 360000 );
} );
