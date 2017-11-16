// Copyright 2017, University of Colorado Boulder

/**
 * Given a repository and a SHA, it checks all live HTML sims to see whether they include the SHA in their release
 * branch or not.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var child_process = require( 'child_process' );
var request = require( 'request' );
var fs = require( 'fs' );
var _ = require( 'lodash' ); // eslint-disable-line

/**
 * @param {Object} grunt - For all of your grunting needs.
 * @param {Function} doneCallback - Called with no arguments when the task is done. Our error/success functions will
 *                                  call this.
 */
module.exports = function( grunt, doneCallback ) {
  return {
    /**
     * Will print out information about with simulations include the given SHA, and which ones don't.
     * @public
     *
     * @param {string} repo
     * @param {string} sha
     */
    check: function( repo, sha ) {
      var self = this;

      // Grab metadata to determine live sims and their release branches
      var metadataURL = 'https://phet.colorado.edu/services/metadata/1.0/simulations?format=json&summary&type=html';
      request( metadataURL, function( requestError, requestResponse, requestBody ) {
        if ( requestError || requestResponse.statusCode !== 200 ) {
          throw new Error( 'request failure' );
        }

        grunt.log.debug( 'parsing json response' );
        var data = JSON.parse( requestBody );

        var sims = data.projects.map( function( simData ) {
          return {
            name: simData.name.slice( simData.name.indexOf( '/' ) + 1 ),
            branch: simData.version.major + '.' + simData.version.minor
          };
        } );

        var includedSims = [];
        var excludedSims = [];

        function nextSim() {
          if ( sims.length ) {
            var sim = sims.shift();
            console.log( 'checking ' + sim.name );

            self.safeGit( [ 'checkout', sim.branch ], '../' + sim.name, function( stdoutData ) {
              var dependencies = JSON.parse( fs.readFileSync( '../' + sim.name + '/dependencies.json', 'utf8' ) );
              var repoSHA = dependencies[ repo ].sha;
              self.git( [ 'merge-base', '--is-ancestor', sha, repoSHA ], '../' + repo, function( exitCode, stdoutData ) {
                ( exitCode === 0 ? includedSims : excludedSims ).push( sim );
                self.safeGit( [ 'checkout', 'master' ], '../' + sim.name, function( stdoutData ) {
                  nextSim();
                } );
              } );
            } );
          }
          else {
            console.log( '\nSims that include the commit in their tree: ' );
            console.log( includedSims.map( function( sim ) { return sim.name; } ).join( '\n' ) );
            console.log( '\nSims that do NOT include the commit in their tree: ' );
            console.log( excludedSims.map( function( sim ) { return sim.name; } ).join( '\n' ) );
            doneCallback();
          }
        }
        nextSim();
      } );

    },

    /**
     * Executes a git command.
     * @private
     *
     * @param {Array.<string>} args - Array of arguments. No need to extra-quote things.
     * @param {string} cwd - The working directory where the process should be run from
     * @param {Function} callback - callback( exitCode: {number}, stdout: {string} ), called when done
     */
    git: function( args, cwd, callback ) {
      var process = child_process.spawn( 'git', args, {
        cwd: cwd
      } );
      grunt.log.debug( 'running ' + args.join( ' ' ) + ' from ' + cwd );

      var stdoutData = ''; // to be appended to

      process.stderr.on( 'data', function( data ) {
        grunt.log.debug( 'stderr: ' + data );
      } );
      process.stdout.on( 'data', function( data ) {
        stdoutData += data;
        grunt.log.debug( 'stdout: ' + data );
      } );

      process.on( 'close', function( code ) {
        callback( code, stdoutData );
      } );
    },

    // Like git above, but errors out if the exit code is nonzero
    safeGit: function( args, cwd, callback ) {
      this.git( args, cwd, function( exitCode, stdoutData ) {
        if ( exitCode !== 0 ) {
          throw new Error( 'Error executing: ' + args.toString() + ' in ' + cwd + ' ' + exitCode );
        }
        callback( stdoutData );
      } );
    }
  };
};