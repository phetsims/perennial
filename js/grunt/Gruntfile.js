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
const createOneOff = require( './createOneOff' );
const createRelease = require( './createRelease' );
const createSim = require( './createSim' );
const dev = require( './dev' );
const execute = require( '../common/execute' );
const generateData = require( './generateData' );
const gruntCommand = require( '../common/gruntCommand' );
const insertRequireStatement = require( './insertRequireStatement' );
const maintenance = require( './maintenance' );
const npmUpdate = require( '../common/npmUpdate' );
const production = require( './production' );
const rc = require( './rc' );
const shaCheck = require( './shaCheck' );
const simMetadata = require( '../common/simMetadata' );
const sortRequireStatements = require( './sortRequireStatements' );
const winston = require( 'winston' );
const wrapper = require( './wrapper' );

module.exports = function( grunt ) {

  if ( grunt.option( 'debug' ) ) {
    winston.default.transports.console.level = 'debug';
  }

  // If true, will skip most prompts, but will fail out on things that should not be done in an automated manner.
  const noninteractive = !!grunt.option( 'noninteractive' );

  /**
   * Wraps a promise's completion with grunt's asynchronous handling, with added helpful failure messages (including stack traces, regardless of whether --stack was provided).
   * @public
   *
   * @param {Promise} promise
   */
  async function wrap( promise ) {
    const done = grunt.task.current.async();

    try {
      await promise;
    } catch ( e ) {
      if ( e.stack ) {
        grunt.fail.fatal( `Perennial task failed:\n${e.stack}\nFull Error details:\n${JSON.stringify( e, null, 2 )}` );
      }
      else if ( typeof e === 'string' ) {
        grunt.fail.fatal( `Perennial task failed: ${e}` );
      }
      else {
        grunt.fail.fatal( `Perennial task failed with unknown error: ${JSON.stringify( e, null, 2 )}` );
      }
    }

    done();
  }

  /**
   * Wraps an async function for a grunt task. Will run the async function when the task should be executed. Will properly handle grunt's async handling, and provides improved
   * error reporting.
   * @public
   *
   * @param {async function} asyncTaskFunction
   */
  function wrapTask( asyncTaskFunction ) {
    return () => {
      wrap( asyncTaskFunction() );
    };
  }

  grunt.registerTask( 'checkout-shas',
    'Check out shas for a project, as specified in dependencies.json\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update\n' +
    '--buildServer : If provided, it will read dependencies from the build-server temporary location (and will skip npm update)',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      const buildServer = grunt.option( 'buildServer' ) ? true : false;

      const repo = grunt.option( 'repo' );
      const dependencies = grunt.file.readJSON( buildServer ? '../perennial/js/build-server/tmp/dependencies.json' : '../' + repo + '/dependencies.json' );
      const includeNpmUpdate = !grunt.option( 'skipNpmUpdate' ) && !buildServer;

      await checkoutDependencies( repo, dependencies, includeNpmUpdate );
    } ) );

  grunt.registerTask( 'checkout-target',
    'Check out a specific branch/SHA for a simulation and all of its declared dependencies\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--target : the branch/SHA to check out\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'target' ), 'Requires specifying a branch/SHA with --target={{BRANCH}}' );

      await checkoutTarget( grunt.option( 'repo' ), grunt.option( 'target' ), !grunt.option( 'skipNpmUpdate' ) );
    } ) );

  grunt.registerTask( 'checkout-release',
    'Check out the latest release branch for a simulation and all of its declared dependencies\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      await checkoutRelease( grunt.option( 'repo' ), !grunt.option( 'skipNpmUpdate' ) );
    } ) );

  grunt.registerTask( 'checkout-master',
    'Check out master branch for all dependencies, as specified in dependencies.json\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      await checkoutMaster( grunt.option( 'repo' ), !grunt.option( 'skipNpmUpdate' ) );
    } ) );

  grunt.registerTask( 'checkout-master-all',
    'Check out master branch for all repos in git root',
    wrapTask( async () => {
      checkoutMasterAll();
    } ) );

  grunt.registerTask( 'sha-check',
    'Checks which simulations\' latest release version includes the given common-code SHA in its git tree.\n' +
    '--repo : repository to check for the SHA\n' +
    '--sha : git SHA',
    wrapTask( async () => {
      shaCheck( this.async() ).check( grunt.option( 'repo' ), grunt.option( 'sha' ) );
    } ) );

  grunt.registerTask( 'maintenance-start',
    'Starts the maintenance-release process.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sims : A comma-separated list of simulations that may be involved in this maintenance release process',
    wrapTask( async () => {
      maintenance( this.async() ).maintenanceStart( grunt.option( 'sims' ) );
    } ) );

  grunt.registerTask( 'maintenance-patch-info',
    'Stores and prints out information about what SHAs of the repositories all of the simulations use.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--repos : A comma-separated list of repo names that need a combined patch',
    wrapTask( async () => {
      maintenance( this.async() ).maintenancePatchInfo( grunt.option( 'repos' ) );
    } ) );

  grunt.registerTask( 'maintenance-patch-checkout',
    'Checks out SHAs for modification and testing.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--repos : A comma-separated list of repo names that need a combined patch\n' +
    '--shas : A comma-separated list of SHAs for the respective repos that need a combined patch\n' +
    '--sim : [optional] preferred sim to test with',
    wrapTask( async () => {
      maintenance( this.async() ).maintenancePatchCheckout( grunt.option( 'repos' ), grunt.option( 'shas' ), grunt.option( 'sim' ) );
    } ) );

  grunt.registerTask( 'maintenance-patch-apply',
    'Applies committed changes to common repos\' sim-specific branches, and updates dependencies.json for affected\n' +
    'sim repos\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--repos : A comma-separated list of repo names that need a combined patch\n' +
    '--message : Additional part of message for the dependencies.json commit',
    wrapTask( async () => {
      maintenance( this.async() ).maintenancePatchApply( grunt.option( 'repos' ), grunt.option( 'message' ) );
    } ) );

  grunt.registerTask( 'maintenance-deploy-rc',
    'Deploys an RC (release candidate) for the simulation from the maintenance branch, bumping versions.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sim : Sim name\n' +
    '--message : Additional part of message for the version bump commit',
    wrapTask( async () => {
      maintenance( this.async() ).maintenanceDeployRC( grunt.option( 'sim' ), grunt.option( 'message' ) );
    } ) );

  grunt.registerTask( 'maintenance-deploy-rc-no-version-bump',
    'Deploys an RC (release candidate) for the simulation from the maintenance branch without bumping versions.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sim : Sim name',
    wrapTask( async () => {
      maintenance( this.async() ).maintenanceDeployRCNoVersionBump( grunt.option( 'sim' ) );
    } ) );

  grunt.registerTask( 'maintenance-deploy-production',
    'Deploys the simulation maintenance release to production, bumping the version number.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sim : Sim name\n' +
    '--message : Additional part of message for the version bump commit',
    wrapTask( async () => {
      maintenance( this.async() ).maintenanceDeployProduction( grunt.option( 'sim' ), grunt.option( 'message' ) );
    } ) );

  grunt.registerTask( 'update-gh-pages',
    'Updates the gh-pages branches for various repos, including building of dot/kite/scenery',
    wrapTask( async () => {
      maintenance( this.async() ).updateGithubPages();
    } ) );

  grunt.registerTask( 'sim-list',
    'Prints out a list of live production HTML sims to stderr (can be filtered from other stdout output)',
    wrapTask( async () => {
      winston.default.transports.console.level = 'error';
      const data = await simMetadata( {
        summary: true,
        type: 'html'
      } );
      console.error( data.projects.map( project => project.name.slice( project.name.indexOf( '/' ) + 1 ) ).join( '\n' ) );
    } ) );

  grunt.registerTask( 'npm-update',
    'Runs npm update/prune for both chipper and the given repository\n' +
    '--repo : The repository to update',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      await npmUpdate( grunt.option( 'repo' ) ).then( () => npmUpdate( 'chipper' ) );
    } ) );

  grunt.registerTask( 'create-release',
    'Creates a new release branch for a given simulation\n' +
    '--repo : The repository to add the release branch to\n' +
    '--branch : The branch name, which should be {{MAJOR}}.{{MINOR}}, e.g. 1.0',
    wrapTask( async () => {
      const repo = grunt.option( 'repo' );
      const branch = grunt.option( 'branch' );
      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( branch, 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( branch.split( '.' ).length === 2, 'Branch should be {{MAJOR}}.{{MINOR}}' );

      await createRelease( repo, branch );
    } ) );

  grunt.registerTask( 'create-one-off',
    'Creates a new release branch for a given simulation\n' +
    '--repo : The repository to add the release branch to\n' +
    '--branch : The branch/one-off name, which should be anything without dahes or periods',
    wrapTask( async () => {
      const repo = grunt.option( 'repo' );
      const branch = grunt.option( 'branch' );
      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( branch, 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( !branch.includes( '-' ) && !branch.includes( '.' ), 'Branch should not contain dashes or periods' );

      await createOneOff( repo, branch );
    } ) );

  grunt.registerTask( 'cherry-pick',
    'Runs cherry-pick on a list of SHAs until one works. Reports success or failure\n' +
    '--repo : The repository to cherry-pick on\n' +
    '--shas : Comma-separated list of SHAs to try',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'shas' ), 'Requires specifying a comma-separated list of SHAs with --shas={{SHAS}}' );

      const repo = grunt.option( 'repo' );
      const shas = grunt.option( 'shas' ).split( ',' );

      await cherryPick( repo, shas );
    } ) );

  grunt.registerTask( 'lint', 'Lints this repository only', wrapTask( async () => {
    grunt.log.writeln( await execute( gruntCommand, [ 'lint', '--repo=perennial' ], '../chipper' ) );
  } ) );

  grunt.registerTask( 'wrapper',
    'Deploys a phet-io wrapper\n' +
    '--repo : The name of the wrapper repository to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      await wrapper( grunt.option( 'repo' ), noninteractive );
    } ) );

  grunt.registerTask( 'dev',
    'Deploys a dev version of the simulation\n' +
    '--repo : The name of the repository to deploy\n' +
    '--brands : A comma-separated list of brand names to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

      await dev( grunt.option( 'repo' ), grunt.option( 'brands' ).split( ',' ), noninteractive, 'master' );
    } ) );

  grunt.registerTask( 'one-off',
    'Deploys a dev version of the simulation\n' +
    '--repo : The name of the repository to deploy\n' +
    '--branch : The name of the one-off branch (the name of the one-off)\n' +
    '--brands : A comma-separated list of brand names to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'branch' ), 'Requires specifying a branch (one-off name) with --branch={{BRANCH}}' );
      assert( grunt.option( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

      await dev( grunt.option( 'repo' ), grunt.option( 'brands' ).split( ',' ), noninteractive, grunt.option( 'branch' ) );
    } ) );

  grunt.registerTask( 'rc',
    'Deploys an rc version of the simulation\n' +
    '--repo : The name of the wrapper repository to deploy\n' +
    '--branch : The release branch name (e.g. "1.7") that should be used for deployment\n' +
    '--brands : A comma-separated list of brand names to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( grunt.option( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

      await rc( grunt.option( 'repo' ), grunt.option( 'branch' ), grunt.option( 'brands' ).split( ',' ), noninteractive );
    } ) );

  grunt.registerTask( 'production',
    'Deploys a production version of the simulation\n' +
    '--repo : The name of the wrapper repository to deploy\n' +
    '--branch : The release branch name (e.g. "1.7") that should be used for deployment\n' +
    '--brands : A comma-separated list of brand names to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( grunt.option( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

      await production( grunt.option( 'repo' ), grunt.option( 'branch' ), grunt.option( 'brands' ).split( ',' ), noninteractive );
    } ) );

  grunt.registerTask( 'create-sim',
    'Creates a sim based on the simula-rasa template.\n' +
    '--repo="string" : the repository repo\n' +
    '--author="string" : the author name\n' +
    '--title="string" : (optional) the simulation title\n' +
    '--clean=true : (optional) deletes the repository directory if it exists',
    wrapTask( async () => {
      const repo = grunt.option( 'repo' );
      const author = grunt.option( 'author' );
      const title = grunt.option( 'title' );
      const clean = grunt.option( 'clean' );

      assert( grunt.option( 'repo' ), 'Requires specifying a repository name with --repo={{REPO}}' );
      assert( grunt.option( 'author' ), 'Requires specifying a author with --author={{AUTHOR}}' );

      await createSim( repo, author, { title, clean } );
    } ) );

  grunt.registerTask( 'sort-require-statements', 'Sort the require statements for a single file (if --file={{FILE}} is provided), or does so for all JS files in a repo (if --repo={{REPO}} is specified)', wrapTask( async () => {
    const file = grunt.option( 'file' );
    const repo = grunt.option( 'repo' );

    assert( !( file && repo ), 'Only one of --file and --repo should be specified' );
    assert( file || repo, 'At least one of --file and --repo should be specified, see documentation' );

    if ( file ) {
      sortRequireStatements( file );
    }
    else {
      grunt.file.recurse( `../${repo}/js`, absfile => sortRequireStatements( absfile ) );
    }
  } ) );

  grunt.registerTask( 'insert-require-statement', 'Insert a require statement into the specified file.\n' +
                                                  '--file absolute path of the file that will receive the require statement\n' +
                                                  '--name to be required', wrapTask( async () => {
    const file = grunt.option( 'file' );
    const name = grunt.option( 'name' );

    assert( grunt.option( 'file' ), 'Requires specifying a file to update with --file={{FILE}}' );
    assert( grunt.option( 'name' ), 'Requires specifying an (import) name with --name={{NAME}}' );

    insertRequireStatement( file, name );
  } ) );

  grunt.registerTask( 'lint-everything', 'lint all js files that are required to build this repository', wrapTask( async () => {
    // --disable-eslint-cache disables the cache, useful for developing rules
    var cache = !grunt.option( 'disable-eslint-cache' );

    // Don't always require this, as we may have an older chipper checked out
    require( '../../../chipper/js/grunt/lint' )( grunt.file.read( 'data/active-repos' ).trim().split( /\r?\n/ ), cache );
  } ) );

  grunt.registerTask( 'generate-data', '[NOTE: Runs automatically on bayes] Generates the lists under perennial/data/, and if there were changes, will commit and push.', wrapTask( async () => {
    await generateData( grunt );
  } ) );
};
