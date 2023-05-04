// Copyright 2002-2015, University of Colorado Boulder

/**
 * Grunt configuration file for tasks that have no dependencies on other repos.
 * In particular, grunt checkout-shas and grunt checkout-master can be run from here
 * without worrying about an older version of chipper being checked out.
 *
 * In general when possible, modules are imported lazily in their task
 * declaration to save on overall load time of this file. The pattern is to require all modules needed at the top of the
 * grunt task registration. If a module is used in multiple tasks, it is best to lazily require in each
 * task.
 */

///////////////////////////
// NOTE: to improve performance, the vast majority of modules are lazily imported in task registrations. Even duplicating
// require statements improves the load time of this file noticeably. For details, see https://github.com/phetsims/chipper/issues/1107
const assertIsValidRepoName = require( '../common/assertIsValidRepoName' );
const assert = require( 'assert' );
const _ = require( 'lodash' );
require( './checkNodeVersion' );
///////////////////////////

module.exports = function( grunt ) {

  if ( grunt.option( 'debug' ) ) {
    const winston = require( 'winston' );

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
    }
    catch( e ) {
      if ( e.stack ) {
        grunt.fail.fatal( `Perennial task failed:\n${e.stack}\nFull Error details:\n${e}` );
      }
      else if ( typeof e === 'string' ) {
        grunt.fail.fatal( `Perennial task failed: ${e}` );
      }
      else {
        grunt.fail.fatal( `Perennial task failed with unknown error: ${e}` );
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

      const checkoutDependencies = require( '../common/checkoutDependencies' );

      const buildServer = !!grunt.option( 'buildServer' );

      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      const dependencies = grunt.file.readJSON( buildServer ? '../perennial/js/build-server/tmp/dependencies.json' : `../${repo}/dependencies.json` );
      const includeNpmUpdate = !grunt.option( 'skipNpmUpdate' ) && !buildServer;

      await checkoutDependencies( repo, dependencies, includeNpmUpdate );
    } ) );

  grunt.registerTask( 'checkout-target',
    'Check out a specific branch/SHA for a simulation and all of its declared dependencies\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--target : the branch/SHA to check out\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    wrapTask( async () => {
      const repo = grunt.option( 'repo' );

      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'target' ), 'Requires specifying a branch/SHA with --target={{BRANCH}}' );

      assertIsValidRepoName( repo );

      const checkoutTarget = require( '../common/checkoutTarget' );

      await checkoutTarget( repo, grunt.option( 'target' ), !grunt.option( 'skipNpmUpdate' ) );
    } ) );

  grunt.registerTask( 'checkout-release',
    'Check out the latest deployed production release branch for a simulation and all of its declared dependencies\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    wrapTask( async () => {
      const checkoutRelease = require( '../common/checkoutRelease' );

      const repo = grunt.option( 'repo' );

      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assertIsValidRepoName( repo );

      await checkoutRelease( repo, !grunt.option( 'skipNpmUpdate' ) );
    } ) );

  grunt.registerTask( 'checkout-timestamp',
    'Check out a specific timestamp for a simulation and all of its declared dependencies\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--timestamp : the timestamp to check things out for, e.g. --timestamp="Jan 08 2018"\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    wrapTask( async () => {
      const repo = grunt.option( 'repo' );

      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'timestamp' ), 'Requires specifying a timestamp with --timestamp={{BRANCH}}' );

      assertIsValidRepoName( repo );

      const checkoutTimestamp = require( '../common/checkoutTimestamp' );

      await checkoutTimestamp( repo, grunt.option( 'timestamp' ), !grunt.option( 'skipNpmUpdate' ) );
    } ) );

  grunt.registerTask( 'checkout-master',
    'Check out master branch for all dependencies, as specified in dependencies.json\n' +
    '--repo : repository name where package.json should be read from\n' +
    '--skipNpmUpdate : If provided, will prevent the usual npm update',
    wrapTask( async () => {
      const repo = grunt.option( 'repo' );

      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      const checkoutMaster = require( '../common/checkoutMaster' );

      assertIsValidRepoName( repo );

      await checkoutMaster( repo, !grunt.option( 'skipNpmUpdate' ) );
    } ) );

  grunt.registerTask( 'checkout-master-all',
    'Check out master branch for all repos in git root',
    wrapTask( async () => {
      const checkoutMasterAll = require( './checkoutMasterAll' );

      checkoutMasterAll();
    } ) );

  grunt.registerTask( 'sha-check',
    'Checks which simulations\' latest release version includes the given common-code SHA in its git tree.\n' +
    '--repo : repository to check for the SHA\n' +
    '--sha : git SHA',
    wrapTask( async () => {
      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      const shaCheck = require( './shaCheck' );

      await shaCheck( repo, grunt.option( 'sha' ) );
    } ) );

  grunt.registerTask( 'print-phet-io-links',
    'Print the current list of all phet-io sims\' links',
    wrapTask( async () => {
      const getPhetioLinks = require( '../common/getPhetioLinks' );
      const phetioLinks = await getPhetioLinks();

      console.log( 'Latest Links:' );
      console.log( `\n${phetioLinks.join( '\n' )}` );
    } ) );

  grunt.registerTask( 'update-gh-pages',
    'Updates the gh-pages branches for various repos, including building of dot/kite/scenery',
    wrapTask( async () => {
      const updateGithubPages = require( '../common/updateGithubPages' );

      await updateGithubPages();
    } ) );

  grunt.registerTask( 'sim-list',
    'Prints out a list of live production HTML sims to stderr (can be filtered from other stdout output)\n' +
    '--versions : Outputs the sim version after its name.',
    wrapTask( async () => {
      const simMetadata = require( '../common/simMetadata' );
      const winston = require( 'winston' );

      winston.default.transports.console.level = 'error';
      const data = await simMetadata( {
        type: 'html'
      } );
      console.error( data.projects.map( project => {
        const name = project.name.slice( project.name.indexOf( '/' ) + 1 );

        let result = name;
        if ( grunt.option( 'versions' ) ) {
          result += ` ${project.version.major}.${project.version.minor}.${project.version.dev}`;
        }
        return result;
      } ).join( '\n' ) );
    } ) );

  grunt.registerTask( 'release-branch-list',
    'Prints out a list of all release branches that would need maintenance patches\n' +
    '--repo : Only show branches for a specific repository\n' +
    '--order=<ORDER> : alphabetical|date',
    wrapTask( async () => {
      const Maintenance = require( '../common/Maintenance' );
      const winston = require( 'winston' );

      winston.default.transports.console.level = 'error';

      const repo = grunt.option( 'repo' );
      const order = grunt.option( 'order' ) || 'alphabetical';

      if ( repo ) {
        assertIsValidRepoName( repo );
      }

      assert( order === 'alphabetical' || order === 'date' );

      const branches = await Maintenance.getMaintenanceBranches( filterRepo => !repo || filterRepo === repo, true, true );

      let structures = [];
      for ( const branch of branches ) {
        structures.push( {
          branch: branch,
          timestamp: await branch.getDivergingTimestamp()
        } );
      }

      if ( order === 'date' ) {
        structures = _.sortBy( structures, struct => struct.timestamp );
      }

      console.log( '\nRelease branches:\n{repo} {branch} {brand[,brand]+} {date}\n' );
      for ( const struct of structures ) {
        console.log( `${struct.branch.toString()} ${new Date( struct.timestamp ).toISOString().split( 'T' )[ 0 ]}` );
      }
    } ) );

  grunt.registerTask( 'npm-update',
    'Runs npm update/prune for chipper, perennial-alias and the given repository\n' +
    '--repo : The repository to update',
    wrapTask( async () => {
      const npmUpdate = require( '../common/npmUpdate' );

      const repo = grunt.option( 'repo' );
      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );

      assertIsValidRepoName( repo );

      await npmUpdate( repo ).then( () => npmUpdate( 'chipper' ) ).then( () => npmUpdate( 'perennial-alias' ) );
    } ) );

  grunt.registerTask( 'create-release',
    'Creates a new release branch for a given simulation\n' +
    '--repo : The repository to add the release branch to\n' +
    '--branch : The branch name, which should be {{MAJOR}}.{{MINOR}}, e.g. 1.0\n' +
    '--brands : The supported brands for the release, comma separated.\n' +
    '--message : An optional message that will be appended on version-change commits.',
    wrapTask( async () => {
      const createRelease = require( './createRelease' );

      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      const branch = grunt.option( 'branch' );
      const message = grunt.option( 'message' );
      const brands = grunt.option( 'brands' );

      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( brands, 'Requires specifying brands with --brands={{BRANDS}} (comma separated)' );
      assert( branch, 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( branch.split( '.' ).length === 2, 'Branch should be {{MAJOR}}.{{MINOR}}' );

      await createRelease( repo, branch, brands.split( ',' ), message );
    } ) );

  grunt.registerTask( 'create-one-off',
    'Creates a new release branch for a given simulation\n' +
    '--repo : The repository to add the release branch to\n' +
    '--branch : The branch/one-off name, which should be anything without dashes or periods\n' +
    '--message : An optional message that will be appended on version-change commits.',
    wrapTask( async () => {
      const createOneOff = require( './createOneOff' );

      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      const branch = grunt.option( 'branch' );
      const message = grunt.option( 'message' );
      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( branch, 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( !branch.includes( '-' ) && !branch.includes( '.' ), 'Branch should not contain dashes or periods' );

      await createOneOff( repo, branch, message );
    } ) );

  grunt.registerTask( 'cherry-pick',
    'Runs cherry-pick on a list of SHAs until one works. Reports success or failure\n' +
    '--repo : The repository to cherry-pick on\n' +
    '--shas : Comma-separated list of SHAs to try',
    wrapTask( async () => {
      const cherryPick = require( './cherryPick' );

      const repo = grunt.option( 'repo' );

      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'shas' ), 'Requires specifying a comma-separated list of SHAs with --shas={{SHAS}}' );

      assertIsValidRepoName( repo );

      const shas = grunt.option( 'shas' ).split( ',' );

      await cherryPick( repo, shas );
    } ) );

  grunt.registerTask( 'lint', 'Lints this repository only', wrapTask( async () => {
    const execute = require( '../common/execute' );
    const gruntCommand = require( '../common/gruntCommand' );

    const index = process.argv.indexOf( 'lint' );
    assert && assert( index >= 0, 'lint command does not appear' );
    const tail = process.argv.slice( index + 1 );

    if ( !grunt.option( 'repos' ) ) {
      tail.push( '--repos=perennial' );
    }

    // Forward to chipper, supporting all of the options
    grunt.log.writeln( ( await execute( gruntCommand, [ 'lint', ...tail ], '../chipper', { errors: 'resolve' } ) ).stdout );
  } ) );

  grunt.registerTask( 'dev',
    'Deploys a dev version of the simulation\n' +
    '--repo : The name of the repository to deploy\n' +
    '--brands : A comma-separated list of brand names to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out\n' +
    '--message : An optional message that will be appended on version-change commits.',
    wrapTask( async () => {
      const dev = require( './dev' );
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      await dev( repo, grunt.option( 'brands' ).split( ',' ), noninteractive, 'master', grunt.option( 'message' ) );
    } ) );

  grunt.registerTask( 'deploy-images',
    'Rebuilds all images\n' +
    '--simulation : Optional. If present, only the given simulation will receive images from master. If absent, all sims' +
    'will receive images from master.',

    wrapTask( async () => {
      console.log( grunt.option( 'simulation' ) );
      const simulation = grunt.option( 'simulation' ) || null;
      const deployImages = require( './deployImages' );
      await deployImages( { simulation: simulation } );
    } ) );

  grunt.registerTask( 'one-off',
    'Deploys a one-off version of the simulation (using the current or specified branch)\n' +
    '--repo : The name of the repository to deploy\n' +
    '--branch : The name of the one-off branch (the name of the one-off)\n' +
    '--brands : A comma-separated list of brand names to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out\n' +
    '--message : An optional message that will be appended on version-change commits.',
    wrapTask( async () => {

      const getBranch = require( '../common/getBranch' );
      const dev = require( './dev' );

      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      const brands = grunt.option( 'brands' );

      assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( brands, 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

      let branch = grunt.option( 'branch' );
      if ( !branch ) {
        branch = await getBranch( repo );
        console.log( `--branch not provided, using ${branch} detected from ${repo}` );
      }
      assert( branch !== 'master', 'One-off deploys for master are unsupported.' );

      await dev( repo, brands.split( ',' ), noninteractive, branch, grunt.option( 'message' ) );
    } ) );

  grunt.registerTask( 'rc',
    'Deploys an rc version of the simulation\n' +
    '--repo : The name of the repository to deploy\n' +
    '--branch : The release branch name (e.g. "1.7") that should be used for deployment\n' +
    '--brands : A comma-separated list of brand names to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out\n' +
    '--message : An optional message that will be appended on version-change commits.',
    wrapTask( async () => {
      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( grunt.option( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      const rc = require( './rc' );

      await rc( repo, grunt.option( 'branch' ), grunt.option( 'brands' ).split( ',' ), noninteractive, grunt.option( 'message' ) );
    } ) );

  grunt.registerTask( 'production',
    'Marks a simulation as published, and deploys a production version of the simulation\n' +
    '--repo : The name of the repository to deploy\n' +
    '--branch : The release branch name (e.g. "1.7") that should be used for deployment\n' +
    '--brands : A comma-separated list of brand names to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out\n' +
    '--message : An optional message that will be appended on version-change commits.',
    wrapTask( async () => {
      const production = require( './production' );
      const markSimAsPublished = require( '../common/markSimAsPublished' );

      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( grunt.option( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      await markSimAsPublished( repo );

      await production( repo, grunt.option( 'branch' ), grunt.option( 'brands' ).split( ',' ), noninteractive, grunt.option( 'message' ) );
    } ) );

  grunt.registerTask( 'prototype',
    'Deploys a production (prototype) version of the simulation\n' +
    '--repo : The name of the repository to deploy\n' +
    '--branch : The release branch name (e.g. "1.7") that should be used for deployment\n' +
    '--brands : A comma-separated list of brand names to deploy\n' +
    '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out\n' +
    '--message : An optional message that will be appended on version-change commits.',
    wrapTask( async () => {
      const production = require( './production' );

      assert( grunt.option( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
      assert( grunt.option( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
      assert( grunt.option( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      await production( repo, grunt.option( 'branch' ), grunt.option( 'brands' ).split( ',' ), noninteractive, grunt.option( 'message' ) );
    } ) );

  grunt.registerTask( 'deploy-decaf',
    'Deploys a decaf version of the simulation\n' +
    '--project : The name of the project to deploy',
    wrapTask( async () => {
      const deployDecaf = require( './decaf/deployDecaf' );

      assert( grunt.option( 'project' ), 'Requires specifying a repository with --project={{PROJECT}}' );
      assert( grunt.option( 'dev' ) || grunt.option( 'production' ), 'Requires at least one of --dev or --production' );
      await deployDecaf( grunt.option( 'project' ), !!grunt.option( 'dev' ), !!grunt.option( 'production' ) );
    } ) );

  grunt.registerTask( 'build-decaf',
    'Builds a decaf version of the simulation\n' +
    '--project : The name of the project to deploy',
    wrapTask( async () => {
      const buildDecaf = require( './decaf/buildDecaf' );

      assert( grunt.option( 'project' ), 'Requires specifying a repository with --project={{PROJECT}}' );
      await buildDecaf( grunt.option( 'project' ), grunt.option( 'preloadResources' ) );
    } ) );

  grunt.registerTask( 'create-sim',
    'Creates a sim based on the simula-rasa template.\n' +
    '--repo="string" : the repository name\n' +
    '--author="string" : the author name\n' +
    '--title="string" : (optional) the simulation title\n' +
    '--clean=true : (optional) deletes the repository directory if it exists',
    wrapTask( async () => {
      const createSim = require( './createSim' );

      const repo = grunt.option( 'repo' );
      assertIsValidRepoName( repo );

      const author = grunt.option( 'author' );
      const title = grunt.option( 'title' );
      const clean = grunt.option( 'clean' );

      assert( repo, 'Requires specifying a repository name with --repo={{REPO}}' );
      assert( grunt.option( 'author' ), 'Requires specifying a author with --author={{AUTHOR}}' );

      await createSim( repo, author, { title: title, clean: clean } );
    } ) );

  grunt.registerTask( 'lint-everything', 'lint all js files for all repos', wrapTask( async () => {
    const getDataFile = require( '../common/getDataFile' );

    // --disable-eslint-cache disables the cache, useful for developing rules
    const cache = !grunt.option( 'disable-eslint-cache' );
    const activeRepos = getDataFile( 'active-repos' );
    const fix = grunt.option( 'fix' );
    const format = grunt.option( 'format' );
    const chipAway = grunt.option( 'chip-away' );
    const disableWithComment = grunt.option( 'disable-with-comment' );
    const showProgressBar = !grunt.option( 'hide-progress-bar' );

    // Don't always require this, as we may have an older chipper checked out.  Also make sure it is the promise-based lint.
    const lint = require( '../../../chipper/js/grunt/lint' );
    if ( lint.chipperAPIVersion === 'promisesPerRepo1' ) {
      const lintReturnValue = await lint( activeRepos, {
        cache: cache,
        fix: fix,
        format: format,
        chipAway: chipAway,
        disableWithComment: disableWithComment,
        showProgressBar: showProgressBar
      } );

      // Output results on errors.
      if ( !lintReturnValue.ok ) {
        grunt.fail.fatal( 'Lint failed' );
      }
    }
  } ) );

  grunt.registerTask( 'generate-data', 'Generates the lists under perennial/data/, and if there were changes, will commit and push.', wrapTask( async () => {
    const generateData = require( './generateData' );
    await generateData( grunt );
  } ) );

  grunt.registerTask( 'clone-missing-repos', 'Clones missing repos', wrapTask( async () => {
    const cloneMissingRepos = require( '../common/cloneMissingRepos' );

    await cloneMissingRepos();
  } ) );

  grunt.registerTask( 'maintenance', 'Starts a maintenance REPL', wrapTask( async () => {
    const Maintenance = require( '../common/Maintenance' );

    await Maintenance.startREPL();
  } ) );

  grunt.registerTask( 'maintenance-check-branch-status', 'Reports out on release branch statuses', wrapTask( async () => {
    const Maintenance = require( '../common/Maintenance' );
    const winston = require( 'winston' );

    winston.default.transports.console.level = 'error';

    await Maintenance.checkBranchStatus();
  } ) );

  grunt.registerTask( 'maintenance-list', 'Lists out the current maintenance process state', wrapTask( async () => {
    const Maintenance = require( '../common/Maintenance' );
    await Maintenance.list();
  } ) );

  grunt.registerTask( 'maintenance-create-patch', 'Adds a patch to the maintenance process', wrapTask( async () => {
    const Maintenance = require( '../common/Maintenance' );

    const repo = grunt.option( 'repo' );
    assertIsValidRepoName( repo );

    const message = grunt.option( 'message' );

    assert( repo, 'Requires specifying a repo that will need to be patched with --repo={{REPO}}' );
    assert( grunt.option( 'message' ), 'Requires specifying a message (included with commits) with --message={{MESSAGE}}' );

    await Maintenance.createPatch( repo, message );
  } ) );

  grunt.registerTask( 'reopen-issues-from-todos', 'If there is a TODO in the project pointing to a closed issue, reopen it.', wrapTask( async () => {
    const reopenIssuesFromTODOs = require( './reopenIssuesFromTODOs' );
    await reopenIssuesFromTODOs();
  } ) );
};
