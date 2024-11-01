// Copyright 2024, University of Colorado Boulder

/**
 * Test that we can invoke a grunt task from the command line, and make sure the options are passed correctly.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
import qunit from 'qunit';

import gruntCommand from '../common/gruntCommand.js';
import { execSync } from 'child_process';

import tsxCommand from '../common/tsxCommand.js';

qunit.module( 'test-exec-sync' );

const checkOutput = ( result: string, assert: Assert ) => {
  assert.ok( result.includes( `<output>
brands: a,b,c
lint: false
noTSC: true
omitted: undefined
</output>` ), 'result should correctly parse and output the options' );
};

qunit.test( 'grunt', ( assert: Assert ) => {
  const result = execSync( `${gruntCommand} test-grunt --brands=a,b,c --lint=false --noTSC`, { encoding: 'utf-8' } );
  checkOutput( result, assert );
} );

qunit.test( 'node grunt', assert => {
  const result = execSync( 'node ../perennial-alias/node_modules/.bin/grunt test-grunt --brands=a,b,c --lint=false --noTSC', { encoding: 'utf-8' } );
  checkOutput( result, assert );
} );

qunit.test( 'tsx', assert => {
  const result = execSync( `${tsxCommand} ../perennial-alias/js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --noTSC`, { encoding: 'utf-8' } );
  checkOutput( result, assert );
} );

qunit.test( 'sage run', assert => {
  const result = execSync( '../perennial-alias/bin/sage run ../perennial-alias/js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --noTSC', { encoding: 'utf-8' } );
  checkOutput( result, assert );
} );

// Testing in particular if the first option is dropped for the grunt default command. Therefore, put  --test-options later so we don't drop it.
// Run in a sim, so we test picking up the default task
qunit.module( 'test-exec-sync:default' );

qunit.test( 'grunt', ( assert: Assert ) => {
  const result = execSync( `${gruntCommand} --brands=a,b,c --lint=false --noTSC --test-options`, { encoding: 'utf-8', cwd: '../acid-base-solutions' } );
  checkOutput( result, assert );
} );

qunit.test( 'node grunt', assert => {
  const result = execSync( 'node ../perennial-alias/node_modules/.bin/grunt --brands=a,b,c --lint=false --noTSC --test-options', { encoding: 'utf-8', cwd: '../acid-base-solutions' } );
  checkOutput( result, assert );
} );