// Copyright 2024, University of Colorado Boulder

/**
 * Test that we can invoke a grunt task from the command line, and make sure the options are passed correctly.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { execSync } from 'child_process';
import _ from 'lodash';
import qunit from 'qunit';
import gruntCommand from '../common/gruntCommand';
import tsxCommand from '../common/tsxCommand';

const SIM = 'acid-base-solutions';

const EXEC_SYNC_OPTIONS = {
  encoding: 'utf-8'
} as const;

const EXEC_AND_SIM_OPTIONS = _.assignIn( {
  cwd: `../${SIM}`
}, EXEC_SYNC_OPTIONS );

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
  const result = execSync( `${gruntCommand} test-grunt --brands=a,b,c --lint=false --noTSC`, EXEC_SYNC_OPTIONS );
  checkOutput( result, assert );
} );

qunit.test( 'tsx', assert => {
  const result = execSync( `${tsxCommand} ../perennial-alias/js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --noTSC`, EXEC_SYNC_OPTIONS );
  checkOutput( result, assert );
} );

qunit.test( 'sage run', assert => {
  const result = execSync( 'bash ../perennial-alias/bin/sage run ../perennial-alias/js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --noTSC', EXEC_SYNC_OPTIONS );
  checkOutput( result, assert );
} );

qunit.test( `grunt ${SIM}`, ( assert: Assert ) => {
  const result = execSync( `${gruntCommand} --brands=a,b,c --lint=false --noTSC --test-options`, EXEC_AND_SIM_OPTIONS );
  checkOutput( result, assert );
} );