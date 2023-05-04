// Copyright 2023, University of Colorado Boulder

const process = require( 'process' );
const fs = require( 'fs' );
const _ = require( 'lodash' );
const Octokit = require( '@octokit/rest' ); // eslint-disable-line require-statement-match

const execute = require( '../common/execute' );
const buildLocal = require( '../common/buildLocal' );
const gruntCommand = require( '../common/gruntCommand' );

/**
 * This script is meant to ensure that all todos pointing to a github issue are pointing to open issues.
 *
 * This script works by. . .
 * - Running lint-everything with a flag to specify a side effect to the todo-should-have-issue rule which will keep
 * track of all todo issues.
 * - Use that list to ping github to see if the issue is open
 * - If not open, reopen it and send a comment noting that there is still at least one todo pointing here.
 *
 * @returns {Promise<void>}
 */
module.exports = async function reopenIssuesFromTODOs() {

  // Mark an environment variable that tells lint's todo-should-have-issue rule to have a side-effect of saving a file
  // with all todo issues.
  process.env.saveTODOIssues = true;

  fs.writeFileSync( '../chipper/dist/issuesFromTODOs.txt', '' );

  console.log( 'grunt lint-everything started' );
  await execute( gruntCommand, [ 'lint-everything', '--disable-eslint-cache' ], '../perennial', {
    errors: 'resolve'
  } );
  console.log( 'grunt lint-everything finished' );


  const TODOIssues = fs.readFileSync( '../chipper/dist/issuesFromTODOs.txt' ).toString().trim().split( '\n' );

  const uniqueTODOIssues = _.uniq( TODOIssues );
  console.log( uniqueTODOIssues.length, 'issues to check' );

  const octokit = new Octokit( {
    auth: buildLocal.phetDevGitHubAccessToken
  } );

  for ( let i = 0; i < uniqueTODOIssues.length; i++ ) {
    const issueURL = uniqueTODOIssues[ i ];

    const repoMatch = issueURL.match( /phetsims\/([\w-]+)\/issues/ );
    const issueNumberMatch = issueURL.match( /phetsims\/[\w-]+\/issues\/(\d+)/ );

    if ( !repoMatch || !issueNumberMatch ) {
      console.log( 'unexpected issue URL:', issueURL );
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
      }
    }
    catch( e ) {
      console.error( 'Issue does not exist', `${repo}#${issueNumber}`, e );
    }
  }
};