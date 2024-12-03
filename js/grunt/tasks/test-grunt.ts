// Copyright 2024, University of Colorado Boulder
/**
 * Run internal tests for the Gruntfile. Note the output is reported over console.log, so be careful what you output.
 * The command invoked is something like this: execSync( `${gruntCommand} test-grunt --brands=a,b,c --lint=false --type-check=false` )
 *
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import testGruntOptions from './util/testGruntOptions.js';

testGruntOptions();