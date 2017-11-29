// Copyright 2002-2015, University of Colorado Boulder

/**
 * Grunt configuration file for tasks that have no dependencies on other repos.
 * In particular, grunt checkout-shas and grunt checkout-master can be run from here
 * without worrying about an older version of chipper being checked out.
 */
/* eslint-env node */
'use strict';


// grunt tasks
const assert = require( 'assert' );
const checkoutDependencies = require( '../common/checkoutDependencies' );
const checkoutMaster = require( '../common/checkoutMaster' );
const checkoutMasterAll = require( './checkoutMasterAll' );
const checkoutRelease = require( '../common/checkoutRelease' );
const checkoutTarget = require( '../common/checkoutTarget' );
const cherryPick = require( './cherryPick' );
const createRelease = require( './createRelease' );
const dev = require( './dev' );
const execute = require( '../common/execute' );
const gruntCommand = require( '../common/gruntCommand' );
const maintenance = require( './maintenance' );
const npmUpdate = require( '../common/npmUpdate' );
const rc = require( './rc' );
const shaCheck = require( './shaCheck' );
const simMetadata = require( '../common/simMetadata' );
const winston = require( 'winston' );

module.exports = function( grunt ) {

  function error( done ) {
    return function( reason ) {
      grunt.log.error( reason );
      done();
      throw new Error( reason );
    };
  }

  grunt.registerTask( 'checkout-shas',
    'Check out shas for a project, as specified in dependencies.json\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update\n' +
    '--buildServer : If provided, it will read dependencies from the build-server temporary location (and will skip npm update)',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      const buildServer = grunt.option( 'buildServer' ) ? true : false;

      const repo = grunt.option( 'repo' );
      const dependencies = grunt.file.readJSON( buildServer ? '../perennial/js/build-server/tmp/dependencies.json' : '../' + repo + '/dependencies.json' );
      const includeNpmUpdate = !grunt.option( 'skipNpmUpdate' ) && !buildServer;

      const done = grunt.task.current.async();
      checkoutDependencies( repo, dependencies, includeNpmUpdate ).then( done ).catch( error( done ) );
    } );

  grunt.registerTask( 'checkout-target',
    'Check out a specific branch/SHA for a simulation and all of its declared dependencies\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--target : the branch/SHA to check out\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'target' ), 'Requires specifying a branch/SHA with --target={{BRANCH}}' );

      const done = grunt.task.current.async();
      checkoutTarget( grunt.option( 'repo' ), grunt.option( 'target' ), !grunt.option( 'skipNpmUpdate' ) ).then( done ).catch( error( done ) );
    } );

  grunt.registerTask( 'checkout-release',
    'Check out the latest release branch for a simulation and all of its declared dependencies\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      const done = grunt.task.current.async();
      checkoutRelease( grunt.option( 'repo' ), !grunt.option( 'skipNpmUpdate' ) ).then( done ).catch( error( done ) );
    } );

  grunt.registerTask( 'checkout-master',
    'Check out master branch for all dependencies, as specified in dependencies.json\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      const done = grunt.task.current.async();
      checkoutMaster( grunt.option( 'repo' ), !grunt.option( 'skipNpmUpdate' ) ).then( done ).catch( error( done ) );
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
      winston.default.transports.console.level = 'error';
      const done = grunt.task.current.async();
      simMetadata( {
        summary: true,
        type: 'html'
      } ).then( data => {
        console.error( data.projects.map( project => project.name.slice( project.name.indexOf( '/' ) + 1 ) ).join( '\n' ) );
      } ).then( done ).catch( error( done ) );
    } );

  grunt.registerTask( 'npm-update',
    'Runs npm update/prune for both chipper and the given repository\n' +
    '--repo : The repository to update',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      const done = grunt.task.current.async();
      npmUpdate( grunt.option( 'repo' ) ).then( () => npmUpdate( 'chipper' ) ).then( done ).catch( error( done ) );
    } );

  grunt.registerTask( 'create-release',
    'Creates a new release branch for a given simulation\n' +
    '--repo : The repository to add the release branch to\n' +
    '--branch : The branch name, which should be {{MAJOR}}.{{MINOR}}, e.g. 1.0',
    function() {
      const repo = grunt.option( 'repo' );
      const branch = grunt.option( 'branch' );
      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( branch, 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( branch.split( '.' ).length === 2, 'Branch should be {{MAJOR}}.{{MINOR}}' );

      const done = grunt.task.current.async();
      createRelease( grunt, repo, branch ).then( done ).catch( error( done ) );
    } );

  grunt.registerTask( 'cherry-pick',
    'Runs cherry-pick on a list of SHAs until one works. Reports success or failure\n' +
    '--repo : The repository to cherry-pick on\n' +
    '--shas : Comma-separated list of SHAs to try',
    function() {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'shas' ), 'Requires specifying a comma-separated list of SHAs with --shas={{SHAS}}' );

      const repo = grunt.option( 'repo' );
      const shas = grunt.option( 'shas' ).split( ',' );

      const done = grunt.task.current.async();
      cherryPick( grunt, repo, shas ).then( done ).catch( error( done ) );
    } );

  grunt.registerTask( 'lint', 'Lints this repository only', async function() {
    const done = grunt.task.current.async();

    try {
      grunt.log.writeln( await execute( gruntCommand, [ 'lint', '--repo=perennial' ], '../chipper' ) );
    }
    catch ( e ) {
      grunt.log.error( e.stdout );
    }

    done();
  } );

  grunt.registerTask( 'dev',
    'Deploys a dev version of the simulation',
    async function() {
      // winston.default.transports.console.level = 'debug';

      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'brand' ), 'Requires specifying a brand with --brand={{BRAND}}' );

      const done = grunt.task.current.async();

      try {
        await dev( grunt, grunt.option( 'repo' ), grunt.option( 'brand' ) );
      } catch ( e ) {
        grunt.fail.fatal( e + '\n' + e.stack );
      }

      done();
    } );

  grunt.registerTask( 'rc',
    'Deploys an rc version of the simulation',
    async function() {
      // winston.default.transports.console.level = 'debug';

      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( grunt.option( 'brand' ), 'Requires specifying a brand with --brand={{BRAND}}' );

      const done = grunt.task.current.async();

      try {
        await rc( grunt, grunt.option( 'repo' ), grunt.option( 'branch' ), grunt.option( 'brand' ) );
      } catch ( e ) {
        grunt.fail.fatal( e + '\n' + e.stack );
      }

      done();
    } );
};
