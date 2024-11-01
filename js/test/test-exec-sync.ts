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

qunit.test( 'Test grunt test-grunt', ( assert: Assert ) => {

  const result = execSync( `${gruntCommand} test-grunt --brands=a,b,c --lint=false --noTSC`, { encoding: 'utf-8' } );

  assert.ok( result.includes( `<output>
brands: a,b,c
lint: false
noTSC: true
omitted: undefined
</output>` ), 'result should correctly parse and output the options' );
} );

qunit.test( 'Test tsx', assert => {

  const result = execSync( `${tsxCommand} ../perennial-alias/js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --noTSC`, {
    encoding: 'utf-8'
  } );

  assert.ok( result.includes( `<output>
brands: a,b,c
lint: false
noTSC: true
omitted: undefined
</output>` ), 'result should correctly parse and output the options' );
} );