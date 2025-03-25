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
import { PERENNIAL_REPO_NAME } from '../common/perennialRepoUtils.js';
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
type-check: false
omitted: undefined
</output>` ), 'result should correctly parse and output the options' );
};

qunit.test( 'grunt no args', ( assert: Assert ) => {
  const result = spawnSync( `${gruntCommand} test-grunt`, SPAWN_SYNC_OPTIONS );
  assert.ok( result.stdout.match( /: undefined/g )?.length === 4, 'no args, all undefined' );
} );

qunit.test( 'grunt args', ( assert: Assert ) => {
  const result = spawnSync( `${gruntCommand} test-grunt --brands=a,b,c --lint=false --type-check=false`, SPAWN_SYNC_OPTIONS );
  checkOutput( result, assert );
} );

qunit.test( 'tsx', assert => {
  const result = spawnSync( `${tsxCommand} ./js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --type-check=false`, SPAWN_SYNC_OPTIONS );
  checkOutput( result, assert );
} );

qunit.test( 'sage run', assert => {
  const result = spawnSync( 'bash ./bin/sage run ./js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --type-check=false', SPAWN_SYNC_OPTIONS );
  checkOutput( result, assert );
} );

// Sim specific test, but perennial shouldn't depend on a sim checkout
if ( fs.existsSync( `../${SIM}/package.json` ) ) {
  qunit.test( `sage run ${SIM}`, ( assert: Assert ) => {
    const result = spawnSync( `bash ../${PERENNIAL_REPO_NAME}/bin/sage run ../${PERENNIAL_REPO_NAME}/js/grunt/tasks/test-grunt.ts --brands=a,b,c --lint=false --type-check=false --test-options`, SPAWN_FOR_SIM_OPTIONS );
    checkOutput( result, assert );
  } );
}

const sageTestFilename = 'do-not-commit.ts';
const warningCode = 'CUSTOM_WARNING';
const normalLog = 'running test file';
const testFileContent = `
console.log( '${normalLog}' );
console.log( 'testArgs', process.argv.join( ' ' ) );
// Emit a custom warning
process.emitWarning( 'Test warning!', {
  code: '${warningCode}'
} );
`;

qunit.module( 'sage run tests', {
  before: () => {
    fs.writeFileSync( sageTestFilename, testFileContent );
  }, after: () => {
    fs.rmSync( sageTestFilename );
  }
} );

qunit.test( 'sage run with node warning', assert => {
  const result = spawnSync( `bash ./bin/sage run ./${sageTestFilename}`, SPAWN_SYNC_OPTIONS );
  assert.ok( result.stdout.includes( normalLog ), 'warning log' );
  assert.ok( result.stderr.includes( warningCode ), 'warning the warning' );
} );

qunit.test( 'sage run without node warning', assert => {
  const result = spawnSync( `bash ./bin/sage run --no-warnings ./${sageTestFilename}`, SPAWN_SYNC_OPTIONS );
  assert.ok( result.stdout.includes( normalLog ), 'no warning log' );
  assert.ok( !result.stderr.includes( warningCode ), 'no warning no warning' );
} );

const args = [ '--test1', '--test2', '--test3=hi' ];
qunit.test( 'sage run with node warning with script args', assert => {
  const result = spawnSync( `bash ./bin/sage run ./${sageTestFilename} ${args.join( ' ' )}`, SPAWN_SYNC_OPTIONS );
  assert.ok( result.stdout.includes( normalLog ), 'no warning log' );
  args.forEach( arg => assert.ok( new RegExp( `testArgs.*${arg}` ).test( result.stdout ), `has arg: ${arg}` ) );
  assert.ok( result.stderr.includes( warningCode ), 'no warning the warning' );
} );

qunit.test( 'sage run without node warning with script args', assert => {
  const result = spawnSync( `bash ./bin/sage run --no-warnings --max_old_space_size=8192 ./${sageTestFilename} ${args.join( ' ' )}`, SPAWN_SYNC_OPTIONS );
  assert.ok( result.stdout.includes( normalLog ), 'no warning log' );
  args.forEach( arg => assert.ok( new RegExp( `testArgs.*${arg}` ).test( result.stdout ), `has arg: ${arg}` ) );
  assert.ok( !result.stderr.includes( warningCode ), 'no warning no warning' );
} );

qunit.test( 'sage run without node warning', assert => {
  const result = spawnSync( `bash ./bin/sage run -fdt --fdsafwd ./${sageTestFilename}`, SPAWN_SYNC_OPTIONS );
  const err = result.stderr;
  assert.ok( err.includes( 'node' ) );
  assert.ok( err.includes( 'bad option' ) );
  assert.ok( err.includes( '-fdt' ) );
  assert.ok( err.includes( '--fdsafwd' ) );
} );

qunit.test( 'sage does not take node options', assert => {
  const result = spawnSync( 'bash ./bin/sage --no-warnings run ./js/grunt/tasks/test-grunt.ts', SPAWN_SYNC_OPTIONS );
  assert.ok( result.status !== 0 );
  assert.ok( result.stderr.includes( '--no-warnings' ) );
} );