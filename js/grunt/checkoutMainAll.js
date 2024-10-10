// Copyright 2002-2015, University of Colorado Boulder

/**
 * This grunt task checks out main for all sims. Useful in some cases where different shas with conflicting dependencies are checked out.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const _ = require( 'lodash' );
const child_process = require( 'child_process' );
const grunt = require( 'grunt' );

/**
 * Checks out main for all repositories in the git root directory.
 * @public
 */
module.exports = function( branch = 'main' ) {
  return new Promise( resolve => {

    const command = `git checkout ${branch}`;

    const potentialGitRoots = grunt.file.expand( { cwd: '../' }, '*' );
    const finished = _.after( potentialGitRoots.length, resolve );

    for ( let i = 0; i < potentialGitRoots.length; i++ ) {
      const filename = potentialGitRoots[ i ]; // Don't change to const without rewrapping usages in the closure
      const repoPath = `../${filename}`;
      const cwd = { cwd: repoPath };
      if ( filename !== 'babel' && // Always on main
           grunt.file.isDir( repoPath ) && // Is a directory
           grunt.file.exists( `${repoPath}/.git` ) && // Is a git repo

           // Only checkout branch if it exists, don't create a new one.
           ( branch === 'main' || child_process.execSync( `git branch --list ${branch}`, cwd ).toString().length > 0 ) ) {
        child_process.exec( command, cwd, error => {
          if ( error ) {
            grunt.log.writeln( `error in ${command} for repo ${filename}` );
          }
          finished();
        } );
      }
      else {
        finished();
      }
    }
  } );
};