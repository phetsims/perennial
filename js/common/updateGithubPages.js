// Copyright 2018, University of Colorado Boulder

/**
 * Updates our github-pages branches (shows up at e.g. https://phetsims.github.io/scenery)
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const execute = require( './execute.js' );
const gitAdd = require( './gitAdd.js' );
const gitCheckout = require( './gitCheckout.js' );
const gitCommit = require( './gitCommit.js' );
const gitIsClean = require( './gitIsClean.js' );
const gitPull = require( './gitPull.js' );
const gitPush = require( './gitPush.js' );
const gruntCommand = require( './gruntCommand.js' );
const npmUpdate = require( './npmUpdate.js' );
const winston = require( 'winston' );

/**
 * Checks to see if the git state/status is clean
 * @public
 *
 * @returns {Promise}
 * @rejects {ExecuteError}
 */
module.exports = async function() {
  winston.info( 'Updating GitHub pages' );

  const taggedRepos = [
    { repo: 'assert' },
    { repo: 'aqua' },
    { repo: 'tandem' },
    { repo: 'query-string-machine' },
    { repo: 'phet-core' },
    { repo: 'chipper' },
    { repo: 'sherpa' },
    { repo: 'axon' },
    { repo: 'dot', build: true },
    { repo: 'kite', build: true },
    { repo: 'scenery', build: true }
  ];

  for ( const taggedRepo of taggedRepos ) {
    const repo = taggedRepo.repo;

    winston.info( `Updating ${repo}` );

    await gitCheckout( repo, 'gh-pages' );
    await gitPull( repo );
    await execute( 'git', [ 'merge', 'main', '-m', 'Update for gh-pages' ], `../${repo}` );

    if ( taggedRepo.build ) {
      await npmUpdate( repo );
      winston.info( `Building ${repo}` );
      await execute( gruntCommand, [], `../${repo}` );

      if ( !await gitIsClean( repo ) ) {
        await gitAdd( repo, 'build' );
        await gitCommit( repo, 'Updating for gh-pages build' );
      }
    }

    await gitPush( repo, 'gh-pages' );
    await gitCheckout( repo, 'main' );
  }
};