// Copyright 2024, University of Colorado Boulder

/**
 * Node qunit tests for registerTasks
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const { getArgsToForward } = require( './registerTasks' );
const registerTasks = require( './registerTasks' );
const qunit = require( 'qunit' );

qunit.module( 'registerTasks' );


qunit.test( 'registerTasks', async assert => {
  assert.ok( getArgsToForward, 'need that function' );
  assert.ok( registerTasks, 'need that function' );

  const test = ( actual, expected, message ) => {
    assert.equal( actual.join( ',' ), expected, message );
  };

  test( getArgsToForward( [ 'grunt', 'lint', '--hi' ] ), '--hi' );
  test( getArgsToForward( [ 'grunt', '--hi' ] ), '--hi' );
  test( getArgsToForward( [ 'node', 'grunt', '--hi' ] ), '--hi' );
  test( getArgsToForward( [ 'node', 'something', 'grunt', '--hi' ] ), '--hi' );
  test( getArgsToForward( [ 'node', '/pm2.', 'task', 'grunt', '--hi' ] ), 'grunt,--hi' );
  test( getArgsToForward( [ 'node', 'grunt' ] ), '' );
} );