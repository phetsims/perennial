// Copyright 2017, University of Colorado Boulder

/**
 * Settings defined in buildLocal
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const assert = require( 'assert' );
const fs = require( 'fs' );
const winston = require( 'winston' );

// Handle the lack of build.json
let buildLocalObject;
try {
  buildLocalObject = JSON.parse( fs.readFileSync( `${process.env.HOME}/.phet/build-local.json`, 'utf8' ) );
}
catch( e ) {
  winston.warn( 'No build-local.json detected!' );
  buildLocalObject = {};
}

module.exports = {
  get devUsername() {
    assert( buildLocalObject.devUsername );
    return buildLocalObject.devUsername;
  },
  get buildServerAuthorizationCode() {
    assert( buildLocalObject.buildServerAuthorizationCode );
    return buildLocalObject.buildServerAuthorizationCode;
  },
  get phetDevGitHubAccessToken() {
    assert( buildLocalObject.phetDevGitHubAccessToken,
      'The phetDevGitHubAccessToken field of build-local.json is required, and can be retrieved from the PhET ' +
      'credentials document for the "Github Machine User" row with the node "phetDevGitHubAccessToken" (it is ' +
      'a hexadecimal string).' );
    return buildLocalObject.phetDevGitHubAccessToken;
  },

  get developerGithubAccessToken() {
    assert( buildLocalObject.developerGithubAccessToken,
      'The developerGithubAccessToken field of build-local.json is required for the use of the scripts in' +
      'phet-info/github-labels.  For information on how to create one, see' +
      'https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line#creating-a-token' );
    return buildLocalObject.developerGithubAccessToken;
  },
  get developerGithubUsername() {
    assert( buildLocalObject.developerGithubUsername,
      'The developerGithubUsername field of build-local.json is required for the use of the scripts in' +
      'phet-info/github-labels.' );
    return buildLocalObject.developerGithubUsername;
  },
  get slackBotToken() {
    assert( buildLocalObject.slackBotToken,
      'The slackBotToken field of build-local.json is required for CT Slack integration' );
    return buildLocalObject.slackBotToken;
  },
  get slackSigningSecret() {
    assert( buildLocalObject.slackSigningSecret,
      'The slackSigningSecret field of build-local.json is required for CT Slack integration' );
    return buildLocalObject.slackSigningSecret;
  },

  // Wrappers are now deployed to the dev location (for convenience)
  devDeployServer: buildLocalObject.devDeployServer || 'bayes.colorado.edu',
  devDeployPath: buildLocalObject.devDeployPath || '/data/web/htdocs/dev/html/',
  decafDeployPath: buildLocalObject.decafDeployPath || '/data/web/htdocs/dev/decaf/',
  buildServerNotifyEmail: buildLocalObject.buildServerNotifyEmail || null,
  productionServerURL: buildLocalObject.productionServerURL || 'https://phet.colorado.edu'
};
