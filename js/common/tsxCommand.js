// Copyright 2024, University of Colorado Boulder

/**
 * Command to run tsx.
 *
 * NOTE: Keep in mind usages before converting to *.ts. grunt/util/registerTasks.js may require this to be *.js for a
 * long time.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */
const path = require( 'path' );

const isWindows = process.platform.startsWith( 'win' );
const runnable = isWindows ? 'tsx.cmd' : 'tsx';

const tsxCommand = `${path.join( __dirname, `../../node_modules/.bin/${runnable}` )}`;

module.exports = tsxCommand;