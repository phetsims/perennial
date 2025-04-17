// Copyright 2024, University of Colorado Boulder

/**
 * This script is meant to ensure that all todos pointing to a github issue are pointing to open issues.
 *
 * This script works by. . .
 * - Running lint --all with a flag to specify a side effect to the to-do-should-have-issue rule which will keep
 * track of all to-do issues.
 * - Use that list to ping github to see if the issue is open
 * - If not open, reopen it and send a comment noting that there is still at least one to-do pointing here.
 *
 * usage:
 * cd perennial
 * sage run js/scripts/reopen-issues-from-todos.ts
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import Octokit from '@octokit/rest';
import fs from 'fs';
import _ from 'lodash';
import process from 'process';
import buildLocal from '../common/buildLocal.js';
import createDirectory from '../common/createDirectory.js';
import getRepoList from '../common/getRepoList.js';
import lint from '../eslint/lint.js';

const CHIPPER_DIST_ESLINT = '../chipper/dist/eslint/';
const TODOsFilename = `${CHIPPER_DIST_ESLINT}/issuesFromTODOs.txt`;

( async () => {

  // Mark an environment variable that tells lint's to-do-should-have-issue rule to have a side-effect of saving a file
  // with all to-do issues.
  process.env.saveTODOIssues = 'true';

  if ( !fs.existsSync( CHIPPER_DIST_ESLINT ) ) {
    await createDirectory( CHIPPER_DIST_ESLINT );
  }
  fs.writeFileSync( TODOsFilename, '' );

  console.log( 'grunt lint --all started' );
  try {
    await lint( getRepoList( 'active-repos' ).filter( repo => repo !== 'perennial' ), {
      clean: true
    } );
  }
  catch( e ) {
    console.error( 'Error running lint --all:\n\n', e );
    process.exit();
  }
  console.log( 'grunt lint --all finished' );

  const TODOIssues = fs.readFileSync( TODOsFilename ).toString().trim().split( '\n' );

  const uniqueTODOIssues = _.uniq( TODOIssues );
  console.log( uniqueTODOIssues.length, 'issues to check' );

  const octokit = new Octokit( {
    auth: buildLocal.phetDevGitHubAccessToken
  } );

  let reopenedCount = 0;

  for ( let i = 0; i < uniqueTODOIssues.length; i++ ) {
    const issueURL = uniqueTODOIssues[ i ];

    const repoMatch = issueURL.match( /phetsims\/([\w-]+)\/issues/ );
    const issueNumberMatch = issueURL.match( /phetsims\/[\w-]+\/issues\/(\d+)/ );

    if ( !repoMatch || !issueNumberMatch ) {
      console.error( 'unexpected issue URL:', issueURL );
      continue;
    }

    const repo = repoMatch[ 1 ];
    const issueNumber = issueNumberMatch[ 1 ];

    // For reference, see https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#update-an-issue
    try {
      const response = await octokit.request( 'GET /repos/{owner}/{repo}/issues/{issue_number}', {
        owner: 'phetsims',
        repo: repo,
        issue_number: issueNumber
      } );
      if ( response.data.state === 'closed' ) {
        console.log( `TODO linking to closed issue: ${issueURL}` );
        await octokit.request( 'PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
          owner: 'phetsims',
          repo: repo,
          issue_number: issueNumber,
          state: 'open'
        } );
        await octokit.request( 'POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          owner: 'phetsims',
          repo: repo,
          issue_number: issueNumber,
          body: 'Reopening because there is a TODO marked for this issue.'
        } );
        reopenedCount++;
      }
    }
    catch( e ) {
      console.error( 'Issue does not exist', `${repo}#${issueNumber}`, e );
    }
  }
  console.log( `Finished. Reopened ${reopenedCount}/${uniqueTODOIssues.length} issues` );
} )();