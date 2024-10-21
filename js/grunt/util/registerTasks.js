// Copyright 2024, University of Colorado Boulder
/**
 * registerTasks.js - Registers all *.js or *.ts files in the tasks directory as grunt tasks.
 * Visits the directory only, does not recurse.
 *
 * This file must remain as *.js + requirejs since it is loaded by Gruntfile.js
 *
 * Moved out of Gruntfile.js on Sept 17, 2024
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
const fs = require( 'fs' );
const getDocumentationForTask = require( './getDocumentationForTask' );
const path = require( 'path' );
const gruntSpawn = require( './gruntSpawn' );
const assert = require( 'assert' );
const _ = require( 'lodash' );
const tsxCommand = require( '../../common/tsxCommand.js' );

function execTask( grunt, taskFilename ) {

  return () => {

    // Grunt tasks look like "node grunt TASK [...args]", we hope.
    const args = process.argv.slice( 3 );
    assert( process.argv[ 0 ].includes( 'node' ), `node expected as the first, runnable arg: ${process.argv[ 0 ]}` );

    gruntSpawn( grunt, tsxCommand, [ taskFilename, ...args ], process.cwd() );
  };
}

const supportedTaskFileExtensions = [ '.js', '.ts', '.cjs' ];

module.exports = ( grunt, dir ) => {
  assert( fs.existsSync( dir ), `dir does not exist: ${dir}` );

  // Grunt has a weird side-effect where one if its dependency's (liftup) dependency (flaggedRespawn) will mutate that
  // args string, removing --watch and adding in --no-respawning. This ruins the watch process for PhET's transpiler.
  if ( process.argv.includes( '--no-respawning' ) && !process.argv.includes( '--watch' ) ) {
    process.argv.splice( process.argv.indexOf( '--no-respawning' ), 1 );
    process.argv.push( '--watch' );
  }

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