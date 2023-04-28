// Copyright 2019, University of Colorado Boulder

/**
 * Creates an issue in a phetsims github repository
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const buildLocal = require( './buildLocal' );
const Octokit = require( '@octokit/rest' ); // eslint-disable-line require-statement-match
const _ = require( 'lodash' );
const winston = require( 'winston' );

/**
 * Creates an issue in a phetsims github repository
 * @public
 *
 * The options include the body/assignees/labels and milestone number, e.g.:
 *
 * githubCreateIssue( 'bumper', 'test issue 2', {
 *   body: 'issue body',
 *   assignees: [ 'jonathanolson' ],
 *   labels: [ 'type:automated-testing' ]
 * } )
 *
 * created https://github.com/phetsims/bumper/issues/3
 *
 * @param {string} repo - The repository name
 * @param {string} title - The title of the issue
 * @param {Object} [options] - Other options to pass in. `body` is recommended. See
 *                             https://octokit.github.io/rest.js/#octokit-routes-issues-create
 * @returns {Promise.<Array.<string>>} - Resolves with checkedOutRepos
 */
module.exports = async function( repo, title, options ) {
  winston.info( `Creating issue for ${repo}` );

  const octokit = new Octokit( {
    auth: buildLocal.phetDevGitHubAccessToken
  } );
  await octokit.issues.create( _.extend( {
    owner: 'phetsims',
    repo: repo,
    title: title
  }, options ) );
};
