// Copyright 2024, University of Colorado Boulder

/**
 * Updates the gh-pages branches for various repos, including building of dot/kite/scenery
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

import winston from 'winston';
import execute from '../common/execute.js';
import gitAdd from '../common/gitAdd.js';
import gitCheckout from '../common/gitCheckout.js';
import gitCommit from '../common/gitCommit.js';
import gitIsClean from '../common/gitIsClean.js';
import gitPull from '../common/gitPull.js';
import gitPush from '../common/gitPush.js';
import gruntCommand from '../common/gruntCommand.js';
import npmUpdate from '../common/npmUpdate.js';

( ( async () => {

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
} ) )();