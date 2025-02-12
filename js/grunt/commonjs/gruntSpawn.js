// Copyright 2024, University of Colorado Boulder
/**
 * Spawns a child process to run a command with the specified arguments. Similar to execute, but simplified to be run
 * from the Gruntfile.cjs
 *
 * Moved out of Gruntfile.cjs on Sept 17, 2024.
 *
 * @param {string} command - The command to run.
 * @param {string[]} args - The arguments to pass to the command.
 * @param {string} cwd - The current working directory for the child process.
 * @param {boolean} [log=false] - Whether to log the command and arguments.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Jonathan Olson (PhET Interactive Simulations)
 */
const child_process = require( 'child_process' );
const isWindows = /^win/.test( process.platform );

module.exports = function spawn( grunt, command, args, cwd, preHook ) {
  const done = grunt.task.current.async();
  const argsString = args.map( arg => `"${arg}"` ).join( ' ' );
  const spawned = child_process.spawn( command, args, {
    cwd: cwd,
    shell: isWindows, // shell is required for a NodeJS security update, see https://github.com/phetsims/perennial/issues/359
    env: Object.create( process.env )
  } );
  preHook && preHook( argsString );

  spawned.stderr.on( 'data', data => process.stderr.write( data.toString() ) );
  spawned.stdout.on( 'data', data => process.stdout.write( data.toString() ) );
  process.stdin.pipe( spawned.stdin );

  spawned.on( 'close', code => {
    done();
    process.exit( code );
  } );
};