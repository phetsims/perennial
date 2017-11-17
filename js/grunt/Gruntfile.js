// Copyright 2002-2015, University of Colorado Boulder

/**
 * Grunt configuration file for tasks that have no dependencies on other repos.
 * In particular, grunt checkout-shas and grunt checkout-master can be run from here
 * without worrying about an older version of chipper being checked out.
 */
/* eslint-env node */
'use strict';


// grunt tasks
var assert = require( 'assert' );
var checkoutDependencies = require( '../common/checkoutDependencies' );
var checkoutMaster = require( '../common/checkoutMaster' );
var checkoutMasterAll = require( './checkoutMasterAll' );
var checkoutRelease = require( '../common/checkoutRelease' );
var checkoutTarget = require( '../common/checkoutTarget' );
var gitCherryPick = require( '../common/gitCherryPick' );
var maintenance = require( './maintenance' );
var npmUpdate = require( '../common/npmUpdate' );
var shaCheck = require( './shaCheck' );
var simMetadata = require( '../common/simMetadata' );

module.exports = function( grunt ) {

  grunt.registerTask( 'checkout-shas',
    'Check out shas for a project, as specified in dependencies.json\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update\n' +
    '--buildServer : If provided, it will read dependencies from the build-server temporary location (and will skip npm update)',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      var buildServer = grunt.option( 'buildServer' ) ? true : false;

      var repo = grunt.option( 'repo' );
      var dependencies = grunt.file.readJSON( buildServer ? '../perennial/js/build-server/tmp/dependencies.json' : '../' + repo + '/dependencies.json' );
      var includeNpmUpdate = !grunt.option( 'skipNpmUpdate' ) && !buildServer;

      var done = grunt.task.current.async();
      checkoutDependencies( repo, dependencies, includeNpmUpdate, function() {
        done();
      } );
    } );

  grunt.registerTask( 'checkout-target',
    'Check out a specific branch/SHA for a simulation and all of its declared dependencies\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--target : the branch/SHA to check out\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'target' ), 'Requires specifying a branch/SHA with --target={{BRANCH}}' );

      var done = grunt.task.current.async();
      checkoutTarget( grunt.option( 'repo' ), grunt.option( 'target' ), !grunt.option( 'skipNpmUpdate' ), function() {
        done();
      } );
    } );

  grunt.registerTask( 'checkout-release',
    'Check out the latest release branch for a simulation and all of its declared dependencies\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      var done = grunt.task.current.async();
      checkoutRelease( grunt.option( 'repo' ), !grunt.option( 'skipNpmUpdate' ), function() {
        done();
      } );
    } );

  grunt.registerTask( 'checkout-master',
    'Check out master branch for all dependencies, as specified in dependencies.json\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      var done = grunt.task.current.async();
      checkoutMaster( grunt.option( 'repo' ), !grunt.option( 'skipNpmUpdate' ), function() {
        done();
      } );
    } );

  grunt.registerTask( 'checkout-master-all',
    'Check out master branch for all repos in git root',
    function() {
      checkoutMasterAll( grunt );
    } );

  grunt.registerTask( 'sha-check',
    'Checks which simulations\' latest release version includes the given common-code SHA in its git tree.\n' +
    '--repo : repository to check for the SHA\n' +
    '--sha : git SHA',
    function() {
      shaCheck( grunt, this.async() ).check( grunt.option( 'repo' ), grunt.option( 'sha' ) );
    } );

  grunt.registerTask( 'maintenance-start',
    'Starts the maintenance-release process.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sims : A comma-separated list of simulations that may be involved in this maintenance release process',
    function() {
      maintenance( grunt, this.async() ).maintenanceStart( grunt.option( 'sims' ) );
    } );

  grunt.registerTask( 'maintenance-patch-info',
    'Stores and prints out information about what SHAs of the repositories all of the simulations use.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--repos : A comma-separated list of repo names that need a combined patch',
    function() {
      maintenance( grunt, this.async() ).maintenancePatchInfo( grunt.option( 'repos' ) );
    } );

  grunt.registerTask( 'maintenance-patch-checkout',
    'Checks out SHAs for modification and testing.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--repos : A comma-separated list of repo names that need a combined patch\n' +
    '--shas : A comma-separated list of SHAs for the respective repos that need a combined patch\n' +
    '--sim : [optional] preferred sim to test with',
    function() {
      maintenance( grunt, this.async() ).maintenancePatchCheckout( grunt.option( 'repos' ), grunt.option( 'shas' ), grunt.option( 'sim' ) );
    } );

  grunt.registerTask( 'maintenance-patch-apply',
    'Applies committed changes to common repos\' sim-specific branches, and updates dependencies.json for affected\n' +
    'sim repos\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--repos : A comma-separated list of repo names that need a combined patch\n' +
    '--message : Additional part of message for the dependencies.json commit',
    function() {
      maintenance( grunt, this.async() ).maintenancePatchApply( grunt.option( 'repos' ), grunt.option( 'message' ) );
    } );

  grunt.registerTask( 'maintenance-deploy-rc',
    'Deploys an RC (release candidate) for the simulation from the maintenance branch, bumping versions.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sim : Sim name\n' +
    '--message : Additional part of message for the version bump commit',
    function() {
      maintenance( grunt, this.async() ).maintenanceDeployRC( grunt.option( 'sim' ), grunt.option( 'message' ) );
    } );

  grunt.registerTask( 'maintenance-deploy-rc-no-version-bump',
    'Deploys an RC (release candidate) for the simulation from the maintenance branch without bumping versions.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sim : Sim name',
    function() {
      maintenance( grunt, this.async() ).maintenanceDeployRCNoVersionBump( grunt.option( 'sim' ) );
    } );

  grunt.registerTask( 'maintenance-deploy-production',
    'Deploys the simulation maintenance release to production, bumping the version number.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sim : Sim name\n' +
    '--message : Additional part of message for the version bump commit',
    function() {
      maintenance( grunt, this.async() ).maintenanceDeployProduction( grunt.option( 'sim' ), grunt.option( 'message' ) );
    } );

  grunt.registerTask( 'update-gh-pages',
    'Updates the gh-pages branches for various repos, including building of dot/kite/scenery',
    function() {
      maintenance( grunt, this.async() ).updateGithubPages();
    } );

  grunt.registerTask( 'sim-list',
    'Prints out a list of live production HTML sims to stderr (can be filtered from other stdout output)',
    function() {
      var done = grunt.task.current.async();
      simMetadata( {
        summary: true,
        type: 'html'
      }, function( data ) {
        console.error( data.projects.map( project => project.name.slice( project.name.indexOf( '/' ) + 1 ) ).join( '\n' ) );
        done();
      } );
    } );

  grunt.registerTask( 'npm-update',
    'Runs npm update/prune for both chipper and the given repository\n' +
    '--repo : The repository to update',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      var done = grunt.task.current.async();
      npmUpdate( grunt.option( 'repo' ), function() {
        npmUpdate( 'chipper', function() {
          done();
        } );
      } );
    } );

  grunt.registerTask( 'cherry-pick',
    'Runs cherry-pick on a list of SHAs until one works. Reports success or failure\n' +
    '--repo : The repository to cherry-pick on\n' +
    '--shas : Comma-separated list of SHAs to try',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'shas' ), 'Requires specifying a comma-separated list of SHAs with --shas={{SHAS}}' );

      var repo = grunt.option( 'repo' );
      var shas = grunt.option( 'shas' ).split( ',' );

      var done = grunt.task.current.async();

      function loop() {
        if ( shas.length ) {
          var sha = shas.shift();
          gitCherryPick( repo, sha, function( success ) {
            if ( success ) {
              grunt.log.ok( 'Cherry-pick with ' + sha + ' was successful' );
              done();
            }
            else {
              loop();
            }
          }, function( code, stdout ) {
            grunt.log.error( 'abort failed with code ' + code + ':\n' + stdout );
            done();
          } );
        }
        else {
          grunt.log.error( 'No SHAs were able to be cherry-picked without conflicts' );
          done();
        }
      }
      loop();
    } );
};
