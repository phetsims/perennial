// Copyright 2002-2015, University of Colorado Boulder

/**
 * This grunt task checks out the shas for a project, as specified in a dependencies.json file in its top level.
 */

const assert = require( 'assert' );
const child_process = require( 'child_process' );
const grunt = require( 'grunt' );

/**
 * NOTE: This is somewhat vestigial, kept to ensure some build-server behavior for now.
 * TODO(chipper1.0) https://github.com/phetsims/perennial/issues/169 remove this when possible (when all chipper 1.0 usage is not required, since all sims are chipper 2.0+)
 *
 * @param {string} repositoryName name field from package.json
 * @param {boolean} toMaster whether master should be used, or dependencies.json shas should be used
 * @param {boolean} buildServer whether this build is initiated by the build server
 */
module.exports = function( repositoryName, toMaster, buildServer ) {

  const dependencies = grunt.file.readJSON( ( buildServer ) ? '../perennial/js/build-server/tmp/dependencies.json' : `../${repositoryName}/dependencies.json` );
  const done = grunt.task.current.async();
  let numToCheckOut = 0;
  let numCheckedOut = 0;
  for ( const property in dependencies ) {
    if ( property !== 'comment' && property !== repositoryName ) {
      numToCheckOut++;
    }
  }

  for ( const property of dependencies ) {
    if ( property !== 'comment' && property !== repositoryName && dependencies.hasOwnProperty( property ) ) {
      assert( typeof dependencies[ property ].branch !== 'undefined' && typeof dependencies[ property ].sha !== 'undefined' );

      grunt.log.writeln( `Checking out dependency ${property}: ${dependencies[ property ].branch}@${dependencies[ property ].sha}` );

      //To execute something from a different directory:
      //cp.exec('foocommand', { cwd: 'path/to/dir/' }, callback);
      //http://stackoverflow.com/questions/14026967/calling-child-process-exec-in-node-as-though-it-was-executed-in-a-specific-folde
      const command = `git checkout ${toMaster ? 'master' : dependencies[ property ].sha}`;
      child_process.exec( command, { cwd: `../${property}` }, ( error1, stdout1, stderr1 ) => {
        assert( !error1, `error in ${command} for repo ${property}` );
        grunt.log.writeln( 'Finished checkout.' );
        grunt.log.writeln( stdout1 );
        grunt.log.writeln( stderr1 );
        numCheckedOut = numCheckedOut + 1;
        if ( numToCheckOut === numCheckedOut ) {
          done();
        }
      } );
    }
  }
};