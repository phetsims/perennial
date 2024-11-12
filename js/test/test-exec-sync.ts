// Copyright 2024, University of Colorado Boulder

/**
 * Test that we can invoke a task from the command line, and make sure the options are passed correctly.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import _ from 'lodash';
import qunit from 'qunit';
import gruntCommand from '../common/gruntCommand.js';
import tsxCommand from '../common/tsxCommand.js';

const SIM = 'acid-base-solutions';

const SPAWN_SYNC_OPTIONS = {
  encoding: 'utf-8',
  shell: true
} as const;

const SPAWN_FOR_SIM_OPTIONS = _.assignIn( {
  cwd: `../${SIM}`
}, SPAWN_SYNC_OPTIONS );

qunit.module( 'test-exec-sync' );

const checkOutput = ( result: ReturnType<typeof spawnSync>, assert: Assert ) => {
  assert.ok( result.status === 0 );
  assert.ok( result.stdout.includes( `<output>
brands: a,b,c
lint: false
noTSC: true
omitted: undefined
</output>` ), 'result should correctly parse and output the options' );
};

qunit.test( 'grunt no args', ( assert: Assert ) => {
  const result = spawnSync( `${gruntCommand} test-grunt`, SPAWN_SYNC_OPTIONS );
  assert.ok( result.stdout.match( /: undefined/g )?.length === 4, 'no args, all undefined' );
} );

qunit.test( 'grunt args', ( assert: Assert ) => {
  const result = spawnSync( `${gruntCommand} test-grunt --brands=a,b,c --lint=false --noTSC`, SPAWN_SYNC_OPTIONS );
  checkOutput( result, assert );
} );

qunit.test( 'tsx', assert => {
  const result = spawnSync( `${tsxCommand} ./js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --noTSC`, SPAWN_SYNC_OPTIONS );
  checkOutput( result, assert );
} );

qunit.test( 'sage run', assert => {
  const result = spawnSync( 'bash ./bin/sage run ./js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --noTSC', SPAWN_SYNC_OPTIONS );
  checkOutput( result, assert );
} );

// Sim-specific
qunit.test( `grunt ${SIM}`, ( assert: Assert ) => {
  const result = spawnSync( `${gruntCommand} --brands=a,b,c --lint=false --noTSC --test-options`, SPAWN_FOR_SIM_OPTIONS );
  checkOutput( result, assert );
} );