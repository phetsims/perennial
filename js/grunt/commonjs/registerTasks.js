// Copyright 2024, University of Colorado Boulder
/**
 * registerTasks.js - Registers all *.js or *.ts files in the tasks directory as grunt tasks.
 * Visits the directory only, does not recurse.
 *
 * This file must remain as *.js + requirejs since it is loaded by Gruntfile.cjs
 *
 * Moved out of Gruntfile.cjs on Sept 17, 2024
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
const fs = require( 'fs' );
const getDocumentationForTask = require( './getDocumentationForTask' );
const path = require( 'path' );
const gruntSpawn = require( './gruntSpawn' );
const assert = require( 'assert' );
const _ = require( 'lodash' );

const isWindows = process.platform.startsWith( 'win' );
const runnable = isWindows ? 'tsx.cmd' : 'tsx';
const tsxCommand = `${path.join( __dirname, `../../../node_modules/.bin/${runnable}` )}`;

/**
 * Grunt tasks generally look like "node grunt TASK [...args]".
 * We only want to forward the options, not the node and grunt runnables, and not the task name. This is complicated
 * because we need to support a fair number of cases:
 * node grunt lint
 * node grunt lint --repo=bumper --all
 * node grunt (default task)
 * node grunt --lint=false
 * grunt lint (not sure this every actually happens, but this algorithm would support it).
 *
 * Assert out eagerly if we get something that is unexpected.
 */
function getArgsToForward( args = process.argv ) {
  for ( let i = 0; i < args.length; i++ ) {

    // Grunt is the most common runnable, but pm2 seems to have its own way of running code, so support that as well.
    if ( args[ i ].includes( 'grunt' ) || /\bpm2\b/.test( args[ i ] ) ) {
      const nextArg = args[ i + 1 ];
      const isNextArgTheTask = !nextArg || !nextArg.startsWith( '-' );
      return args.slice( i + ( isNextArgTheTask ? 2 : 1 ) );
    }
  }
  assert( false, `unexpected grunt task arguments that didn't launch with "grunt": [${args.join( ' ' )}]` );
  return [];
}

function execTask( grunt, taskFilename ) {

  return () => {

    const args = getArgsToForward();

    gruntSpawn( grunt, tsxCommand, [ taskFilename, ...args ], process.cwd() );
  };
}

const supportedTaskFileExtensions = [ '.js', '.ts', '.cjs' ];

module.exports = ( grunt, dir ) => {
  assert( fs.existsSync( dir ), `dir does not exist: ${dir}` );

  // Load each file from tasks/ and register it as a task
  fs.readdirSync( dir ).forEach( file => {
    if ( _.some( supportedTaskFileExtensions, extension => file.endsWith( extension ) ) ) {
      const taskName = file.substring( 0, file.lastIndexOf( '.' ) );

      const numberOfFiles = supportedTaskFileExtensions.map( extension => fs.existsSync( path.join( dir, `${taskName}${extension}` ) ) ).filter( _.identity );
      if ( numberOfFiles.length > 1 ) {
        throw new Error( `Both TypeScript and JavaScript versions of the task ${taskName} exist. Please remove one of them.` );
      }
      else {
        const absolutePath = path.join( dir, file );
        grunt.registerTask( taskName, getDocumentationForTask( absolutePath ), execTask( grunt, absolutePath ) );
      }
    }
  } );
};

module.exports.getArgsToForward = getArgsToForward;