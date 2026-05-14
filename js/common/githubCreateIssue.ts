// Copyright 2019-2026, University of Colorado Boulder

/**
 * Creates an issue in a phetsims github repository
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { buildLocal } from './buildLocal.js';
import Octokit from '@octokit/rest';
import _ from 'lodash';
import winston from 'winston';

/**
 * Creates an issue in a phetsims github repository
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
 * @param repo - The repository name
 * @param title - The title of the issue
 * @param  [options] - Other options to pass in. `body` is recommended. See
 *                     https://octokit.github.io/rest.js/#octokit-routes-issues-create
 */
export const githubCreateIssue = async (
  repo: string,
  title: string,
  options: Octokit.RequestOptions & Octokit.IssuesCreateParams
): Promise<void> => {
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
