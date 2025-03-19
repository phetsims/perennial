// Copyright 2025, University of Colorado Boulder
/**
 * Script that prints active repos that are out of date with their remote. Uses current HEAD, comma separated,
 * to stdout. All other logging will be on stderr.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import winston from 'winston';
import getRepoList from '../common/getRepoList.js';
import isGitRemoteDifferent from '../common/isGitRemoteDifferent.js';

// We don't want to pollute stdout since we are most likely machine-parsing output.
winston.default.transports.console.level = 'error';

( async () => {

  const repos = getRepoList( 'active-repos' );
  const reposDifferent: string[] = [];
  const statusPromises = repos.map( async repo => {

    // NOTE that this may return true if we have unpushed local commits as well as needing a pull.
    await isGitRemoteDifferent( repo ) && reposDifferent.push( repo );
  } );

  await Promise.all( statusPromises );
  process.stdout.write( reposDifferent.join( ',' ) ); // no newline to trim at the end
} )();